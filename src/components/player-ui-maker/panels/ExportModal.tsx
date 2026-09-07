import React, { useState } from "react";
import { useEditorStore } from "../store/useEditorStore";
import {
  downloadProjectAsJson,
  generateReactComponentCode,
} from "../utils/exportImport";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { project } = useEditorStore();
  const [activeTab, setActiveTab] = useState<"json" | "react">("json");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const jsonString = JSON.stringify(project, null, 2);
  const reactCode = generateReactComponentCode(project);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in text-[#2D3748] select-none">
      <div className="w-full max-w-3xl bg-white border border-[#E2E8F0] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2F6FED]/10 border border-[#2F6FED]/20 flex items-center justify-center text-[#2F6FED]">
              <i className="fa-solid fa-file-export text-lg" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#2D3748]">
                Export Game UI Project
              </h2>
              <p className="text-xs text-[#64748B]">
                Project:{" "}
                <span className="text-[#2F6FED] font-semibold">
                  {project.name}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white hover:bg-[#F0F2F5] border border-[#E2E8F0] text-[#64748B] hover:text-[#2D3748] flex items-center justify-center transition-colors cursor-pointer shadow-sm"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Format Selector Tabs */}
        <div className="flex border-b border-[#E2E8F0] bg-[#F8FAFC]/60 px-6 pt-2">
          <button
            onClick={() => setActiveTab("json")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "json"
                ? "text-[#2F6FED] border-[#2F6FED]"
                : "text-[#64748B] border-transparent hover:text-[#2D3748]"
            }`}
          >
            <i className="fa-solid fa-code" />
            JSON Runtime Manifest
          </button>

          <button
            onClick={() => setActiveTab("react")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "react"
                ? "text-[#2F6FED] border-[#2F6FED]"
                : "text-[#64748B] border-transparent hover:text-[#2D3748]"
            }`}
          >
            <i className="fa-brands fa-react" />
            Static React Component (TSX)
          </button>
        </div>

        {/* Code Content Box */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col bg-[#F0F2F5]">
          <div className="flex-1 overflow-auto bg-white border border-[#E2E8F0] rounded-2xl p-4 font-mono text-xs text-[#334155] custom-scrollbar select-text shadow-inner">
            <pre>{activeTab === "json" ? jsonString : reactCode}</pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <button
            onClick={() =>
              handleCopy(activeTab === "json" ? jsonString : reactCode)
            }
            className="px-4 py-2 rounded-xl bg-white hover:bg-[#F0F2F5] border border-[#CBD5E1] text-[#2D3748] font-semibold text-xs flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <i
              className={
                copied
                  ? "fa-solid fa-check text-[#10B981]"
                  : "fa-regular fa-copy"
              }
            />
            {copied ? "Copied to Clipboard!" : "Copy Code"}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F0F2F5] text-[#64748B] hover:text-[#2D3748] font-semibold text-xs cursor-pointer shadow-sm"
            >
              Close
            </button>

            {activeTab === "json" && (
              <button
                onClick={() => downloadProjectAsJson(project)}
                className="px-6 py-2 rounded-xl bg-[#2F6FED] hover:bg-[#2557BC] text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-download" />
                Download JSON File
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
