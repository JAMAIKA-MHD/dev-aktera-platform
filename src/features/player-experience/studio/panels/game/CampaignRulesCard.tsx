import { Check, ExternalLink, Lock } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { DEFAULT_RULES } from "../../../domain/campaign";
import { GAME_LABELS } from "../../../domain/gameTypes";
import {
  useStudio,
  useStudioContext,
  type CampaignSettingsSection,
} from "../../StudioContext";
import { useCampaignView } from "./useCampaignView";

// What decides a win (plan §6.6), shown read-only at the top of the Game panel: odds, prizes
// with their stock and weight, questions with the right answer, thresholds. Rules live in the
// campaign, read by the server: the Studio shows them and sends the brand to the Wizard to
// change them, it never edits them. On return, the app refetches the campaign.

function EditButton({ section }: { section: CampaignSettingsSection }) {
  const { onEditCampaignSettings, onRefreshCampaign } = useStudioContext();
  const campaignId = useStudio((state) => state.campaignId);
  const waiting = useRef(false);

  // Back from the Wizard in another tab or window: the focus comes back here.
  useEffect(() => {
    const onFocus = () => {
      if (!waiting.current) return;
      waiting.current = false;
      onRefreshCampaign?.();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [onRefreshCampaign]);

  if (!onEditCampaignSettings || !campaignId) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        waiting.current = true;
        await onEditCampaignSettings(campaignId, section);
        waiting.current = false;
        onRefreshCampaign?.();
      }}
      className="flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-blue-600 transition hover:bg-blue-50 active:scale-95 dark:text-blue-400 dark:hover:bg-blue-500/10"
    >
      <ExternalLink className="size-3.5" aria-hidden />
      Edit in campaign settings
    </button>
  );
}

function Block({
  title,
  section,
  children,
}: {
  title: string;
  section: CampaignSettingsSection;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2 border-t border-card-border pt-3 first:border-t-0 first:pt-0">
      <div className="flex min-h-9 items-center justify-between gap-2">
        <h4 className="text-[10px] font-black uppercase tracking-wider text-brand-text-muted">
          {title}
        </h4>
        <EditButton section={section} />
      </div>
      {children}
    </div>
  );
}

export function CampaignRulesCard() {
  const { campaign, rules, standalone } = useCampaignView();
  const quiz = campaign.rules.quiz ?? DEFAULT_RULES.quiz;
  const hitIt = campaign.rules.hitIt ?? DEFAULT_RULES.hitIt;
  const correct = new Map(
    rules?.quiz?.questions.map((question) => [
      question.id,
      question.correctIndex,
    ]),
  );
  const stock = new Map(rules?.prizes.map((prize) => [prize.id, prize]));

  return (
    <section
      aria-label="Campaign rules"
      className="space-y-3 rounded-2xl border border-dashed border-card-border bg-card-bg-subtle p-4"
    >
      <div className="flex items-center gap-2">
        <Lock className="size-4 text-brand-text-muted" aria-hidden />
        <h3 className="flex-1 text-sm font-bold text-brand-text">
          Campaign rules
        </h3>
        <span className="rounded-full bg-card-bg px-2.5 py-1 text-[11px] font-bold text-brand-text ring-1 ring-card-border">
          {GAME_LABELS[campaign.gameType]}
        </span>
      </div>
      <p className="text-xs text-brand-text-muted">
        {standalone
          ? "Demo campaign: every prize is equally likely. Link a campaign to see its real odds."
          : "Read-only here: the server draws with these rules."}
      </p>

      <Block title="Odds" section="rules">
        <p className="text-sm text-brand-text">
          {rules ? (
            <>
              <strong className="text-lg font-black tabular-nums">
                {rules.winProbability} %
              </strong>{" "}
              chance to win
            </>
          ) : (
            "Set in the campaign settings."
          )}
        </p>
        {campaign.gameType === "quiz" && (
          <p className="text-xs text-brand-text-muted">
            Pass mark {quiz.passThresholdPercent} % ·{" "}
            {quiz.secondsPerQuestion > 0
              ? `${quiz.secondsPerQuestion} s per question`
              : "no timer"}
          </p>
        )}
        {campaign.gameType === "hit_it" && (
          <p className="text-xs text-brand-text-muted">
            {hitIt.winThreshold} hit{hitIt.winThreshold > 1 ? "s" : ""} in{" "}
            {hitIt.durationSeconds} s to qualify
          </p>
        )}
      </Block>

      <Block title="Prizes" section="prizes">
        {campaign.prizes.length === 0 ? (
          <p className="text-xs text-brand-text-muted">No prize yet.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="text-brand-text-muted">
              <tr>
                <th className="py-1 font-semibold">Prize</th>
                <th className="py-1 text-right font-semibold">Left</th>
                <th className="py-1 text-right font-semibold">Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border text-brand-text">
              {campaign.prizes.map((prize) => (
                <tr key={prize.id}>
                  <td className="py-1.5 font-semibold">{prize.name || "—"}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {stock.get(prize.id)?.remaining ?? "—"}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">
                    {stock.get(prize.id)?.weight ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Block>

      {campaign.gameType === "quiz" && (
        <Block title="Questions" section="questions">
          <ol className="space-y-2">
            {campaign.quiz.map((question, index) => (
              <li key={question.id} className="text-xs">
                <p dir="auto" className="font-semibold text-brand-text">
                  {index + 1}. {question.text}
                </p>
                <ul className="mt-1 flex flex-wrap gap-1">
                  {question.options.map((option, at) => {
                    const right = correct.get(question.id) === at;
                    return (
                      <li
                        key={at}
                        dir="auto"
                        className={`flex items-center gap-1 rounded-md px-2 py-0.5 ${
                          right
                            ? "bg-emerald-50 font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : "bg-card-bg text-brand-text-muted ring-1 ring-card-border"
                        }`}
                      >
                        {right && (
                          <Check
                            className="size-3"
                            aria-label="Correct answer"
                          />
                        )}
                        {option}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        </Block>
      )}
    </section>
  );
}
