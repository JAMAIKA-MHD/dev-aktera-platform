/**
 * Campaign Creator — Multi-step Form
 * ====================================
 * Creates or relaunches a campaign with 3 steps:
 * 1. Basics (name, dates, mechanic, win_probability)
 * 2. Prizes (wheel) or Questions (quiz)
 * 3. Review & Publish
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useCampaign } from '../../hooks/useCampaign';
import { usePrizes } from '../../hooks/usePrizes';
import { useQuizQuestions } from '../../hooks/useQuizQuestions';
import { usePrizeTemplates } from '../../hooks/usePrizeTemplates';
import { ImageUploader } from '../../components/common/ImageUploader';
import { toFriendlyErrorMessage } from '../../lib/errorMessages';
import {
  Globe2,
  ChevronRight,
  ChevronLeft,
  Check,
  Gift,
  HelpCircle,
  Eye,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Calendar,
} from 'lucide-react';
import type { Campaign } from '../../types';
import { Phase2InlineNotice, Phase2PageHeader } from '../../features/phase2-ui';

interface PrizeFormData {
  prize_template_id: string;
  quantity: number;
  use_all_available: boolean;
  weight: number;
  is_consolation: boolean;
  win_message: string;
}

interface QuestionFormData {
  question: string;
  options: string[];
  correct_option_index: number;
}

interface CampaignFormData {
  name: string;
  slug: string;
  description: string;
  hero_image_url: string;
  start_date: string;
  end_date: string;
  win_probability: number;
  require_phone: boolean;
  require_quiz: boolean;
  mechanic: 'wheel' | 'quiz';
  prizes: PrizeFormData[];
  questions: QuestionFormData[];
}

interface DatabaseErrorLike {
  code?: string;
}

const defaultPrize: PrizeFormData = {
  prize_template_id: '',
  quantity: 1,
  use_all_available: false,
  weight: 1,
  is_consolation: false,
  win_message: '',
};

const defaultQuestion: QuestionFormData = {
  question: '',
  options: ['', ''],
  correct_option_index: 0,
};

export default function CampaignCreator() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id: routeCampaignId } = useParams<{ id: string }>();
  const { organization, loading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionMode, setSubmissionMode] = useState<'draft' | 'active' | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fromCampaignId = searchParams.get('from');
  const editCampaignId = searchParams.get('edit') ?? routeCampaignId ?? null;
  const creationMode = searchParams.get('mode');
  const isEditMode = Boolean(editCampaignId);
  const isUpdateDraftMode = !isEditMode && Boolean(fromCampaignId) && creationMode === 'update';
  const sourceCampaignId = editCampaignId ?? fromCampaignId;

  const { campaign: sourceCampaign, loading: sourceLoading } = useCampaign(sourceCampaignId);
  const { prizes: sourcePrizes } = usePrizes(sourceCampaignId);
  const { questions: sourceQuestions } = useQuizQuestions(sourceCampaignId);
  const { templates: prizeTemplates, loading: templatesLoading } = usePrizeTemplates();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CampaignFormData>({
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      hero_image_url: '',
      start_date: '',
      end_date: '',
      win_probability: 25,
      require_phone: true,
      require_quiz: false,
      mechanic: 'wheel',
      prizes: [{ ...defaultPrize }],
      questions: [{ ...defaultQuestion }],
    },
  });

  const {
    fields: prizeFields,
    append: appendPrize,
    remove: removePrize,
  } = useFieldArray({ control, name: 'prizes' });

  const {
    fields: questionFields,
    append: appendQuestion,
    remove: removeQuestion,
  } = useFieldArray({ control, name: 'questions' });

  const mechanic = watch('mechanic');
  const winProbability = watch('win_probability');
  const requireQuiz = watch('require_quiz');
  const questionStep = 2;
  const reviewStep = 3;
  const maxSteps = reviewStep;

  const getCampaignReservedQuantity = (templateId: string) => {
    if (!isEditMode) return 0;
    return sourcePrizes
      .filter((prize) => prize.prize_template_id === templateId)
      .reduce((sum, prize) => sum + Number(prize.quantity ?? 0), 0);
  };

  const getTemplateAvailableQuantity = (templateId: string) => {
    const template = prizeTemplates.find((item) => item.id === templateId);
    const globalAvailableQuantity = template?.available_quantity ?? 0;
    const campaignReservedQuantity = getCampaignReservedQuantity(templateId);
    return globalAvailableQuantity + campaignReservedQuantity;
  };

  const getTemplateTotalQuantity = (templateId: string) => {
    const template = prizeTemplates.find((item) => item.id === templateId);
    return Number(template?.stock_quantity ?? 0);
  };

  const getTemplateReservedByOtherCampaigns = (templateId: string) => {
    const template = prizeTemplates.find((item) => item.id === templateId);
    const totalReserved = Number(template?.reserved_quantity ?? 0);
    const campaignReservedQuantity = getCampaignReservedQuantity(templateId);
    return Math.max(totalReserved - campaignReservedQuantity, 0);
  };

  const normalizePrizeQuantity = (prize: PrizeFormData) => {
    const availableQuantity = getTemplateAvailableQuantity(prize.prize_template_id);
    if (prize.use_all_available) {
      return availableQuantity;
    }
    return prize.quantity;
  };

  const fetchLatestTemplateAvailability = async (templateIds: string[]) => {
    const uniqueTemplateIds = Array.from(new Set(templateIds));
    if (uniqueTemplateIds.length === 0) {
      return new Map<string, number>();
    }

    const { data: templateRows, error: templateError } = await supabase
      .from('prize_templates')
      .select('id, stock_quantity')
      .in('id', uniqueTemplateIds);
    if (templateError) throw templateError;

    const { data: reservedRows, error: reservedError } = await supabase
      .from('prizes')
      .select('prize_template_id, quantity, campaigns!inner(status)')
      .in('prize_template_id', uniqueTemplateIds)
      .in('campaigns.status', ['draft', 'active', 'paused']);
    if (reservedError) throw reservedError;

    const reservedByTemplateId = new Map<string, number>();
    for (const row of ((reservedRows as Array<{ prize_template_id: string; quantity: number }> | null) ?? [])) {
      reservedByTemplateId.set(
        row.prize_template_id,
        (reservedByTemplateId.get(row.prize_template_id) ?? 0) + Number(row.quantity ?? 0),
      );
    }

    const availableByTemplateId = new Map<string, number>();
    for (const template of ((templateRows as Array<{ id: string; stock_quantity: number }> | null) ?? [])) {
      const available = Math.max(
        Number(template.stock_quantity ?? 0) - (reservedByTemplateId.get(template.id) ?? 0),
        0,
      );
      availableByTemplateId.set(template.id, available);
    }

    return availableByTemplateId;
  };

  // Pre-fill from existing campaign
  useEffect(() => {
    if (sourceCampaign && !sourceLoading && sourceCampaignId) {
      const startDate = new Date(sourceCampaign.start_date);
      const endDate = new Date(sourceCampaign.end_date);
      const shouldShiftByYear = !isEditMode && !isUpdateDraftMode;
      const shouldCreateDerivedName = !isEditMode;
      const newStartDate = new Date(startDate);
      const newEndDate = new Date(endDate);

      if (shouldShiftByYear) {
        newStartDate.setFullYear(newStartDate.getFullYear() + 1);
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
      }

      const derivedName = isUpdateDraftMode
        ? `${sourceCampaign.name} (Update Draft)`
        : `${sourceCampaign.name} (Relance)`;
      const derivedSlug = isUpdateDraftMode
        ? generateUpdateSlug(sourceCampaign.slug)
        : `${sourceCampaign.slug}-relance`;

      reset({
        name: shouldCreateDerivedName ? derivedName : sourceCampaign.name,
        slug: shouldCreateDerivedName ? derivedSlug : sourceCampaign.slug,
        description: sourceCampaign.description || '',
        hero_image_url: sourceCampaign.hero_image_url || '',
        start_date: newStartDate.toISOString().split('T')[0],
        end_date: newEndDate.toISOString().split('T')[0],
        win_probability: Math.round(sourceCampaign.win_probability * 100),
        require_phone: sourceCampaign.require_phone,
        require_quiz: sourceCampaign.require_quiz,
        mechanic: sourceCampaign.require_quiz ? 'quiz' : 'wheel',
        prizes: sourcePrizes.length > 0
          ? sourcePrizes.map((p) => ({
              prize_template_id: p.prize_template_id,
              quantity: p.quantity,
              use_all_available: false,
              weight: p.weight,
              is_consolation: false,
              win_message: p.win_message || '',
            }))
          : [{ ...defaultPrize }],
        questions: sourceQuestions.length > 0
          ? sourceQuestions.map((q) => ({
              question: q.question,
              options: q.options,
              correct_option_index: q.correct_option_index,
            }))
          : [{ ...defaultQuestion }],
      });
    }
  }, [
    sourceCampaign,
    sourcePrizes,
    sourceQuestions,
    sourceLoading,
    sourceCampaignId,
    isEditMode,
    isUpdateDraftMode,
    reset,
  ]);

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const generateUpdateSlug = (slug: string) => {
    const suffix = Date.now().toString().slice(-5);
    return `${slug}-update-${suffix}`;
  };

  // Handle name change to auto-generate slug
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValue('name', name);
    if (!fromCampaignId && !isEditMode) {
      setValue('slug', generateSlug(name));
    }
  };

  const getFriendlySubmitError = (error: unknown): string => {
    const dbError = error as DatabaseErrorLike;
    if (dbError.code === '22003') {
      return 'Some numeric values are out of range. Please check win probability, quantity, and weight values.';
    }

    return toFriendlyErrorMessage(error, {
      fallback: 'Failed to create campaign. Please verify your data and try again.',
    });
  };

  // Validate step before proceeding
  const validateStep = async (step: number): Promise<boolean> => {
    setStepError(null);
    if (step === 1) {
      const name = watch('name');
      const slug = watch('slug');
      const startDate = watch('start_date');
      const endDate = watch('end_date');

      if (!name || !slug || !startDate || !endDate) {
        setStepError('Please fill in all required fields marked with *');
        return false;
      }

      if (new Date(endDate) <= new Date(startDate)) {
        setStepError('End date must be after the start date.');
        return false;
      }

      if (!requireQuiz) {
        const winProbabilityValue = watch('win_probability');
        if (
          !Number.isFinite(winProbabilityValue) ||
          winProbabilityValue < 0 ||
          winProbabilityValue > 80
        ) {
          setStepError('Win probability must be between 0% and 80%.');
          return false;
        }
      }

      // Check slug uniqueness
      const { data: existing, error: slugCheckError } = await supabase
        .from('campaigns')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (slugCheckError) {
        setStepError('Failed to verify unique URL slug. Please try again.');
        return false;
      }

      if (existing && (!isEditMode || existing.id !== editCampaignId)) {
        setStepError('This URL slug is already taken. Please choose another one.');
        return false;
      }
    }

    if (!requireQuiz && step === 2) {
      const prizes = watch('prizes');
      const validPrizes = prizes
        .filter((p) => p.prize_template_id)
        .map((p) => ({
          ...p,
          quantity: normalizePrizeQuantity(p),
        }))
        .filter((p) => p.quantity > 0);
      if (validPrizes.length === 0) {
        setStepError('Please select at least one prize template with quantity greater than 0.');
        return false;
      }

      const seenTemplateIds = new Set<string>();
      for (const prize of validPrizes) {
        if (seenTemplateIds.has(prize.prize_template_id)) {
          setStepError('Each template can be selected only once per campaign.');
          return false;
        }
        seenTemplateIds.add(prize.prize_template_id);
      }

      const hasInvalidQuantity = validPrizes.some(
        (p) => !Number.isFinite(p.quantity) || p.quantity > 1000000,
      );
      if (hasInvalidQuantity) {
        setStepError('Prize quantity must be between 1 and 1,000,000.');
        return false;
      }

      const hasInvalidWeight = validPrizes.some(
        (p) => !Number.isFinite(p.weight) || p.weight <= 0 || p.weight > 9999.9999,
      );
      if (hasInvalidWeight) {
        setStepError('Prize weight must be greater than 0 and at most 9999.9999.');
        return false;
      }

      for (const prize of validPrizes) {
        const availableQuantity = getTemplateAvailableQuantity(prize.prize_template_id);
        if (availableQuantity <= 0) {
          setStepError('One selected template has no available stock. Adjust your selection.');
          return false;
        }
        if (prize.quantity > availableQuantity) {
          setStepError(
            'Selected quantity exceeds currently available template stock. Please lower quantity or choose "Use all available".',
          );
          return false;
        }
      }
    }

    if (requireQuiz && step === questionStep) {
      const questions = watch('questions');
      const validQuestions = questions.filter(
        (q) => q.question.trim() && q.options.filter((o) => o.trim()).length >= 2
      );
      if (validQuestions.length === 0) {
        setStepError('Please add at least one valid quiz question with a text and at least 2 non-empty options.');
        return false;
      }
    }

    return true;
  };

  // Navigate between steps
  const nextStep = async () => {
    const valid = await validateStep(currentStep);
    if (valid) {
      setStepError(null);
      setCurrentStep((s) => Math.min(s + 1, maxSteps));
    }
  };

  const prevStep = () => {
    setStepError(null);
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  // Submit campaign
  const onSubmit = async (data: CampaignFormData, status: 'draft' | 'active') => {
    setSubmitError(null);
    if (!organization) {
      setSubmitError('Unable to create campaign: Your user account is not linked to a valid organization.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionMode(status);
    try {
      if (isEditMode && (!sourceCampaign || sourceCampaign.status !== 'draft')) {
        throw new Error('Only draft campaigns can be edited directly.');
      }

      if (!isEditMode && isUpdateDraftMode && status === 'active' && fromCampaignId) {
        const { error: archiveSourceError } = await supabase
          .from('campaigns')
          .update({ status: 'archived' })
          .eq('id', fromCampaignId)
          .in('status', ['active', 'paused']);
        if (archiveSourceError) throw archiveSourceError;
      }

      const campaignPayload = {
        organization_id: organization.id,
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        hero_image_url: data.hero_image_url || null,
        status,
        start_date: data.start_date,
        end_date: data.end_date,
        win_probability: data.require_quiz ? 0 : data.win_probability / 100,
        require_phone: data.require_phone,
        require_quiz: data.require_quiz,
        source_campaign_id: isEditMode
          ? sourceCampaign?.source_campaign_id ?? null
          : isUpdateDraftMode
          ? fromCampaignId
          : null,
      };

      let campaign: Campaign;

      if (isEditMode && sourceCampaign) {
        const { data: updatedCampaign, error: updateCampaignError } = await supabase
          .from('campaigns')
          .update(campaignPayload)
          .eq('id', sourceCampaign.id)
          .select()
          .single();
        if (updateCampaignError) throw updateCampaignError;
        if (!updatedCampaign) throw new Error('Campaign update returned no data.');
        campaign = updatedCampaign as Campaign;
      } else {
        const { data: campaignData, error: campaignError } = await supabase
          .from('campaigns')
          .insert(campaignPayload)
          .select()
          .single();

        if (campaignError) throw campaignError;
        if (!campaignData) {
          throw new Error('Campaign creation returned no data.');
        }
        campaign = campaignData as Campaign;
      }

      if (isEditMode && sourceCampaign) {
        const { error: deleteInventoryError } = await supabase
          .from('prize_inventory')
          .delete()
          .eq('campaign_id', sourceCampaign.id);
        if (deleteInventoryError) throw deleteInventoryError;

        const { error: deletePrizesError } = await supabase
          .from('prizes')
          .delete()
          .eq('campaign_id', sourceCampaign.id);
        if (deletePrizesError) throw deletePrizesError;

        const { error: deleteQuestionsError } = await supabase
          .from('quiz_questions')
          .delete()
          .eq('campaign_id', sourceCampaign.id);
        if (deleteQuestionsError) throw deleteQuestionsError;
      }

      // Create prizes with inventory (ONLY if not a quiz campaign)
      if (!data.require_quiz) {
        const selectedPrizes = data.prizes
          .filter((p) => p.prize_template_id)
          .map((p) => ({
            ...p,
            quantity: p.quantity,
          }))
          .filter((p) => p.quantity > 0);

        const templateIds = selectedPrizes.map((prize) => prize.prize_template_id);
        const latestAvailability = await fetchLatestTemplateAvailability(templateIds);
        const validPrizes = selectedPrizes.map((prize) => ({
          ...prize,
          quantity: prize.use_all_available
            ? latestAvailability.get(prize.prize_template_id) ?? 0
            : prize.quantity,
        }));

        for (const prize of validPrizes) {
          const available = latestAvailability.get(prize.prize_template_id) ?? 0;
          if (available <= 0) {
            throw new Error('A selected template no longer has available stock.');
          }
          if (prize.quantity > available) {
            throw new Error(
              `Requested quantity exceeds available stock for template "${prizeTemplates.find((t) => t.id === prize.prize_template_id)?.name ?? 'Unknown template'}".`,
            );
          }
        }

        for (const prize of validPrizes) {
          const selectedTemplate = prizeTemplates.find((template) => template.id === prize.prize_template_id);
          if (!selectedTemplate) {
            throw new Error('A selected prize template was not found. Please refresh and try again.');
          }

          // Create the prize
          const { data: prizeData, error: prizeError } = await supabase
            .from('prizes')
            .insert({
              campaign_id: campaign.id,
              organization_id: organization.id,
              prize_template_id: selectedTemplate.id,
              name: selectedTemplate.name,
              description: selectedTemplate.description,
              image_url: selectedTemplate.image_url,
              quantity: prize.quantity,
              quantity_won: 0,
              weight: prize.weight,
              probability: prize.is_consolation ? 0 : (data.win_probability / 100) / validPrizes.length,
              win_message: prize.win_message || null,
              is_active: true,
            })
            .select()
            .single();

          if (prizeError) throw prizeError;

          const prizeId = prizeData ? (prizeData as { id: string }).id : '';

          // Create inventory
          const { data: inventoryData, error: inventoryError } = await supabase
            .from('prize_inventory')
            .insert({
              prize_id: prizeId,
              campaign_id: campaign.id,
              organization_id: organization.id,
              initial_quantity: prize.quantity,
              remaining: prize.quantity,
              claimed: 0,
            })
            .select('id')
            .single();

          if (inventoryError) throw inventoryError;
          if (!inventoryData) {
            throw new Error('Inventory creation returned no data.');
          }

          const inventoryItemRows = Array.from({ length: prize.quantity }, (_, index) => ({
            prize_inventory_id: inventoryData.id,
            prize_id: prizeId,
            campaign_id: campaign.id,
            organization_id: organization.id,
            item_index: index + 1,
            item_value: null,
            source_type: 'manual',
          }));

          const { error: inventoryItemsError } = await supabase
            .from('prize_inventory_items')
            .insert(inventoryItemRows);

          if (inventoryItemsError) throw inventoryItemsError;
        }
      }

      // Create quiz questions if required
      if (data.require_quiz) {
        const validQuestions = data.questions.filter(
          (q) => q.question.trim() && q.options.filter((o) => o.trim()).length >= 2
        );

        for (let i = 0; i < validQuestions.length; i++) {
          const q = validQuestions[i];
          const { error: questionError } = await supabase
            .from('quiz_questions')
            .insert({
              campaign_id: campaign.id,
              organization_id: organization.id,
              question: q.question,
              options: q.options.filter((o) => o.trim()),
              correct_option_index: q.correct_option_index,
              position: i + 1,
              is_active: true,
            });

          if (questionError) throw questionError;
        }
      }

      navigate(`/dashboard/campaigns/${campaign.id}`);
    } catch (err: unknown) {
      console.error('Error creating campaign:', err);
      setSubmitError(getFriendlySubmitError(err));
    } finally {
      setIsSubmitting(false);
      setSubmissionMode(null);
    }
  };

  const handleFormSubmit = (data: CampaignFormData) => onSubmit(data, 'active');

  const steps = requireQuiz
    ? [
        { number: 1, title: 'Basics', icon: Calendar },
        { number: 2, title: 'Questions', icon: HelpCircle },
        { number: 3, title: 'Review', icon: Eye },
      ]
    : [
        { number: 1, title: 'Basics', icon: Calendar },
        { number: 2, title: 'Prizes', icon: Gift },
        { number: 3, title: 'Review', icon: Eye },
      ];

  if (sourceLoading && sourceCampaignId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (isEditMode && !sourceLoading && !sourceCampaign) {
    return (
      <div className="mx-auto mt-8 max-w-xl rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-rose-800">Campaign not found</h2>
        <p className="mt-2 text-rose-600">
          The selected campaign could not be loaded for editing.
        </p>
      </div>
    );
  }

  if (isEditMode && sourceCampaign && sourceCampaign.status !== 'draft') {
    return (
      <div className="mx-auto mt-8 max-w-xl rounded-[28px] border border-amber-200 bg-amber-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-amber-800">Editing restricted</h2>
        <p className="mt-2 text-amber-700">
          Only draft campaigns can be edited directly. Create an update draft from this campaign first.
        </p>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="mx-auto mt-8 max-w-xl rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-rose-800">Missing organization session</h2>
        <p className="mt-2 text-rose-600">
          Your account is not linked to an organization profile. Please register or contact support.
        </p>
      </div>
    );
  }

  const pageTitle = isEditMode
    ? 'Edit campaign'
    : isUpdateDraftMode
      ? 'New update draft'
      : fromCampaignId
        ? 'Relaunch campaign'
        : 'New campaign';

  const pageDescription = isEditMode
    ? 'Adjust a draft campaign while preserving the current validation and allocation safeguards.'
    : isUpdateDraftMode
      ? 'Prepare a safe update draft derived from a live campaign without disrupting its current logic.'
      : fromCampaignId
        ? 'Reuse an earlier campaign as a relaunch baseline while preserving the existing routing and creation flow.'
        : 'Configure a new wheel or quiz campaign using the current multi-step creation flow.';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Phase2PageHeader
        eyebrow="Campaign builder wizard"
        title={pageTitle}
        description={pageDescription}
        action={
          sourceCampaignId ? (
            <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-600">
              {isEditMode ? 'Draft edit' : isUpdateDraftMode ? 'Update draft' : 'Relaunch mode'}
            </span>
          ) : undefined
        }
      />

      {stepError || submitError ? (
        <Phase2InlineNotice tone="danger" title="Please review">
          {stepError || submitError}
        </Phase2InlineNotice>
      ) : null}

      {(fromCampaignId || isUpdateDraftMode) && !isEditMode ? (
        <Phase2InlineNotice tone="info" title="Derived campaign flow">
          This flow keeps the source campaign intact unless you explicitly publish an update draft,
          in which case the current logic archives the old live campaign before activating the new one.
        </Phase2InlineNotice>
      ) : null}

      <div className="dashboard-card rounded-[28px] p-3">
        <div className="grid grid-cols-3 gap-2">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  if (step.number <= currentStep) {
                    setStepError(null);
                    setCurrentStep(step.number);
                  }
                }}
                className={`touch-target flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  currentStep === step.number
                    ? 'bg-indigo-600 text-white shadow-ui-glow'
                    : currentStep > step.number
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-50 text-slate-400'
                } ${step.number <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                disabled={step.number > currentStep}
              >
                <step.icon className="h-4 w-4" />
                <span>{step.title}</span>
              </button>
              {index < steps.length - 1 ? (
                <ChevronRight className="mx-1 hidden h-4 w-4 text-slate-300 md:block" />
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {currentStep === 1 && (
          <div className="dashboard-card rounded-[28px] p-6 space-y-6">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-2.5 text-indigo-600">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Basics and live-compatible settings</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Configure the routed campaign fields that already exist in the live product.
                </p>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Campaign name *
              </label>
              <input
                type="text"
                {...register('name', { required: true })}
                onChange={handleNameChange}
                className="touch-target w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white"
                placeholder="e.g. Ramadan campaign 2024"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-rose-500">This field is required</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                URL Slug *
              </label>
              <div className="flex items-center">
                <span className="mr-2 text-sm text-slate-500">/play/</span>
                <input
                  type="text"
                  {...register('slug', { required: true })}
                  className="touch-target flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white"
                  placeholder="jeu-concours-ramadan-2024"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white"
                placeholder="Short description shown to players"
              />
            </div>

            <ImageUploader
              value={watch('hero_image_url')}
              onChange={(url) => setValue('hero_image_url', url)}
              folder="campaigns"
              label="Campaign image"
            />
            <input type="hidden" {...register('hero_image_url')} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Start date *
                </label>
                <input
                  type="date"
                  {...register('start_date', { required: true })}
                  className="touch-target w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  End date *
                </label>
                <input
                  type="date"
                  {...register('end_date', { required: true })}
                  className="touch-target w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Game mechanic
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setValue('mechanic', 'wheel');
                    setValue('require_quiz', false);
                  }}
                  className={`touch-target flex-1 rounded-2xl border px-4 py-3 transition ${
                    mechanic === 'wheel'
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Gift className="mx-auto mb-1 h-5 w-5" />
                  <span className="text-sm font-medium">Wheel (Instant Win)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setValue('mechanic', 'quiz');
                    setValue('require_quiz', true);
                    setValue('win_probability', 0);
                  }}
                  className={`touch-target flex-1 rounded-2xl border px-4 py-3 transition ${
                    mechanic === 'quiz'
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <HelpCircle className="mx-auto mb-1 h-5 w-5" />
                  <span className="text-sm font-medium">Quiz (Raffle/Draw)</span>
                </button>
              </div>
            </div>

            {mechanic === 'wheel' && (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Win probability: {winProbability}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="1"
                  {...register('win_probability', { valueAsNumber: true })}
                  className="w-full cursor-pointer appearance-none rounded-lg bg-slate-200"
                />
                <div className="mt-1 flex justify-between text-xs text-slate-500">
                  <span>0%</span>
                  <span>40%</span>
                  <span>80%</span>
                </div>
              </div>
            )}

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="require_phone"
                  {...register('require_phone')}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="require_phone" className="text-sm text-slate-700">
                  Require participant phone number
                </label>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-[24px] border border-indigo-100 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-2.5 text-indigo-600">
                      <Globe2 className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        Consumer Arabic preview (preserved UI surface)
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        This field is intentionally kept visible from the new UI, but it remains
                        preview-only until a later milestone adds a safe persisted campaign copy field.
                      </p>
                      <textarea
                        readOnly
                        dir="auto"
                        value="سجل واربح هدايا فورية قيمة من حملتنا!"
                        className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                      />
                    </div>
                  </div>
                </div>
                <div className="rounded-[24px] border border-amber-100 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-2.5 text-amber-600">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Participation cap preview
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        The current product still relies on the existing duplicate-participation
                        protection. Configurable per-campaign entry caps from the new UI stay visible
                        as a planned surface until a later backend milestone supports them safely.
                      </p>
                      <div className="mt-3 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                        Current live behavior: duplicate-safe participation protection remains unchanged
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!requireQuiz && currentStep === 2 && (
          <div className="dashboard-card rounded-[28px] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Gift className="h-5 w-5 text-indigo-600" />
                Prizes to win
              </h2>
              <button
                type="button"
                onClick={() => appendPrize({ ...defaultPrize })}
                className="touch-target inline-flex items-center gap-1 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>

            <div className="space-y-4">
              {prizeFields.map((field, index) => {
                const selectedTemplateId = watch(`prizes.${index}.prize_template_id`);
                const useAllAvailable = watch(`prizes.${index}.use_all_available`);
                const availableQuantity = selectedTemplateId
                  ? getTemplateAvailableQuantity(selectedTemplateId)
                  : 0;

                return (
                <div key={field.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Template
                        </label>
                        <select
                          {...register(`prizes.${index}.prize_template_id`)}
                          className="touch-target w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400"
                        >
                          <option value="">Select a template</option>
                          {prizeTemplates.map((template) => {
                            const effectiveAvailable = getTemplateAvailableQuantity(template.id);
                            return (
                            <option
                              key={template.id}
                              value={template.id}
                              disabled={effectiveAvailable <= 0}
                            >
                              {template.name} ({effectiveAvailable} available)
                            </option>
                            );
                          })}
                        </select>
                        {selectedTemplateId && (
                          <p className="mt-1 text-xs text-slate-500">
                            Total: {getTemplateTotalQuantity(selectedTemplateId)} | Reserved by other campaigns:{' '}
                            {getTemplateReservedByOtherCampaigns(selectedTemplateId)} | Available for this campaign:{' '}
                            {availableQuantity}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={Math.max(availableQuantity, 1)}
                          {...register(`prizes.${index}.quantity`, { valueAsNumber: true })}
                          disabled={useAllAvailable}
                          className="touch-target w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 disabled:bg-slate-100"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          Set a number up to available quantity.
                        </p>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Weight
                        </label>
                        <input
                          type="number"
                          min="0.0001"
                          max="9999.9999"
                          step="0.1"
                          {...register(`prizes.${index}.weight`, { valueAsNumber: true })}
                          className="touch-target w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-3">
                      {prizeFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePrize(index)}
                          className="rounded-2xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Winner message (optional)
                    </label>
                    <input
                      type="text"
                      {...register(`prizes.${index}.win_message`)}
                      className="touch-target w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400"
                      placeholder="Congratulations! You won..."
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`use-all-${index}`}
                      {...register(`prizes.${index}.use_all_available`)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor={`use-all-${index}`} className="text-xs text-slate-600">
                      Use all currently available quantity for this template
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`consolation-${index}`}
                      {...register(`prizes.${index}.is_consolation`)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor={`consolation-${index}`} className="text-xs text-slate-600">
                      Consolation prize (excluded from draw odds)
                    </label>
                  </div>
                </div>
                );
              })}
            </div>
            {templatesLoading && (
              <p className="text-xs text-slate-500">Loading templates...</p>
            )}
            {!templatesLoading && prizeTemplates.length === 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                No prize templates available. Create templates first in the prize template library.
              </div>
            )}
          </div>
        )}

        {currentStep === questionStep && requireQuiz && (
          <div className="dashboard-card rounded-[28px] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <HelpCircle className="h-5 w-5 text-indigo-600" />
                Quiz questions
              </h2>
              <button
                type="button"
                onClick={() => appendQuestion({ ...defaultQuestion })}
                className="touch-target inline-flex items-center gap-1 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>

            <div className="space-y-4">
              {questionFields.map((field, index) => (
                <div key={field.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-2 text-sm font-semibold text-slate-400">
                      Q{index + 1}
                    </span>
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        {...register(`questions.${index}.question`)}
                        className="touch-target w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400"
                        placeholder="Write your question..."
                      />

                      <div className="space-y-2">
                        {[0, 1, 2, 3].map((optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${index}`}
                              checked={watch(`questions.${index}.correct_option_index`) === optIdx}
                              onChange={() => setValue(`questions.${index}.correct_option_index`, optIdx)}
                              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                            />
                            <input
                              type="text"
                              {...register(`questions.${index}.options.${optIdx}`)}
                              className="touch-target flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400"
                              placeholder={`Option ${optIdx + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500">Select the correct answer</p>
                    </div>

                    {questionFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(index)}
                        className="rounded-2xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === reviewStep && (
          <div className="dashboard-card rounded-[28px] p-6 space-y-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Eye className="h-5 w-5 text-indigo-600" />
              Review and publish
            </h2>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Information</h3>
                <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <span className="text-slate-500">Name:</span>
                    <span className="ml-2 font-medium text-slate-900">{watch('name')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Slug:</span>
                    <span className="ml-2 font-mono text-slate-900">/play/{watch('slug')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Period:</span>
                    <span className="ml-2 text-slate-900">
                      {watch('start_date')} → {watch('end_date')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Probability:</span>
                    <span className="ml-2 text-slate-900">{watch('win_probability')}%</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Prizes ({watch('prizes').filter((p) => p.prize_template_id).length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {watch('prizes')
                    .filter((p) => p.prize_template_id)
                    .map((prize, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        <span className="font-medium">
                          {prizeTemplates.find((template) => template.id === prize.prize_template_id)?.name ?? 'Unknown template'}
                        </span>
                        <span className="text-slate-500">
                          (
                          x
                          {prize.use_all_available
                           ? getTemplateAvailableQuantity(prize.prize_template_id)
                           : prize.quantity}
                          )
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {requireQuiz && watch('questions').filter((q) => q.question.trim()).length > 0 && (
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Questions ({watch('questions').filter((q) => q.question.trim()).length})
                  </h3>
                  <div className="space-y-2">
                    {watch('questions')
                      .filter((q) => q.question.trim())
                      .map((q, idx) => (
                        <div key={idx} className="text-sm text-slate-700">
                          {idx + 1}. {q.question}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="rounded-[24px] border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl border border-indigo-100 bg-white p-2.5 text-indigo-600">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Preserved new UI surfaces</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      Arabic campaign copy and configurable participation caps remain visible in the
                      wizard direction, but only the current live-safe fields are persisted in this
                      milestone.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row">
              <button
                type="button"
                onClick={handleSubmit((data) => onSubmit(data, 'active'))}
                disabled={isSubmitting}
                className="touch-target flex flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-500 disabled:bg-slate-400"
              >
                {isSubmitting && submissionMode === 'active' ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    Publish (active)
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleSubmit((data) => onSubmit(data, 'draft'))}
                disabled={isSubmitting}
                className="touch-target flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 font-medium text-slate-700 transition hover:bg-slate-50 disabled:bg-slate-100"
              >
                {isSubmitting && submissionMode === 'draft' ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save as draft'
                )}
              </button>
            </div>
          </div>
        )}

        {(currentStep > 1 || currentStep < maxSteps) && (
          <div className="flex gap-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="touch-target inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-slate-700 transition hover:bg-slate-50"
              >
                <ChevronLeft className="h-5 w-5" />
                Back
              </button>
            )}
            {currentStep < maxSteps && (
              <button
                type="button"
                onClick={nextStep}
                className="touch-target ml-auto inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-white transition hover:bg-indigo-500"
              >
                Next
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
