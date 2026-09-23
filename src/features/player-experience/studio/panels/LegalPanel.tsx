import type { LegalLink } from "../../domain/types";
import { createUuid } from "../../domain/uuid";
import { Field, inputClass } from "../fields/Field";
import { ListEditor } from "../fields/ListEditor";
import { LocalizedTextField } from "../fields/LocalizedTextField";
import { SelectField } from "../fields/SelectField";
import { useStudio } from "../StudioContext";
import {
  PanelBody,
  PanelHeader,
  PanelIssues,
  PanelSection,
} from "./PanelLayout";
import { useTextLocale } from "./useTextLocale";

// Legal (plan §9.2): who organizes the game, the footer links, the short mention and the full
// legal text. Links accept https:, mailto: and tel: only — the schema refuses anything else,
// and the runtime checks again where it draws the link (domain/legal.ts).

const KINDS = [
  { value: "terms", label: "Game rules" },
  { value: "privacy", label: "Privacy" },
  { value: "support", label: "Support" },
  { value: "url", label: "Other link" },
] as const;

export const MAX_LEGAL_LINKS = 5;

export function LegalPanel() {
  const legal = useStudio((state) => state.config.legal);
  const updateLegal = useStudio((state) => state.updateLegal);
  const textLocale = useTextLocale();

  return (
    <>
      <PanelHeader
        title="Legal"
        description="Who runs the game, and the links every screen shows at the bottom."
      />
      <PanelBody>
        <PanelSection title="Organizer">
          <Field
            label="Organizer name"
            path="legal.organizerName"
            hint="Named in the legal text and the rules."
          >
            {(id) => (
              <input
                id={id}
                dir="auto"
                value={legal.organizerName}
                maxLength={80}
                placeholder="Zeta Market SARL"
                onChange={(event) =>
                  updateLegal({ organizerName: event.target.value })
                }
                className={inputClass}
              />
            )}
          </Field>
        </PanelSection>

        <PanelSection
          title="Footer links"
          description="Without an address, Game rules, Privacy and Support open the legal text below."
        >
          <PanelIssues prefixes={["legal.links"]} />
          <ListEditor<LegalLink>
            label="Links"
            path="legal.links"
            items={legal.links}
            onChange={(links) => updateLegal({ links })}
            max={MAX_LEGAL_LINKS}
            addLabel="Add a link"
            getKey={(link) => link.id}
            itemLabel={(link, index) =>
              `Link ${index + 1} · ${KINDS.find((kind) => kind.value === link.kind)?.label}`
            }
            createItem={() => ({ id: createUuid(), kind: "url", label: {} })}
            renderItem={(link, index, update) => (
              <div className="space-y-3">
                <SelectField
                  label="Kind"
                  value={link.kind}
                  options={KINDS}
                  onChange={(kind) => update({ ...link, kind })}
                />
                <LocalizedTextField
                  label="Label"
                  path={`legal.links.${index}.label`}
                  value={link.label}
                  onChange={(label) => update({ ...link, label })}
                  maxChars={24}
                  required
                  {...textLocale}
                />
                <Field
                  label="Address"
                  path={`legal.links.${index}.url`}
                  hint="https://…, mailto:… or tel:…"
                >
                  {(id) => (
                    <input
                      id={id}
                      type="url"
                      inputMode="url"
                      spellCheck={false}
                      value={link.url ?? ""}
                      placeholder={
                        link.kind === "url"
                          ? "https://"
                          : "Empty: opens the legal text"
                      }
                      onChange={(event) => {
                        const url = event.target.value.trim();
                        const { url: _old, ...rest } = link;
                        update(url ? { ...rest, url } : rest);
                      }}
                      className={inputClass}
                    />
                  )}
                </Field>
              </div>
            )}
          />
        </PanelSection>

        <PanelSection title="Mentions">
          <PanelIssues prefixes={["legal.legalLine", "legal.termsBody"]} />
          <LocalizedTextField
            label="Short mention"
            path="legal.legalLine"
            value={legal.legalLine}
            onChange={(legalLine) => updateLegal({ legalLine })}
            maxChars={120}
            hint="Scrolls at the bottom of the welcome screen."
            {...textLocale}
          />
          <LocalizedTextField
            label="Legal text"
            path="legal.termsBody"
            value={legal.termsBody}
            onChange={(termsBody) => updateLegal({ termsBody })}
            multiline
            hint="Opened by the footer links: rules, data use, contact."
            {...textLocale}
          />
        </PanelSection>
      </PanelBody>
    </>
  );
}
