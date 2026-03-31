import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface InfoButtonProps {
  title: string;
  description: string;
  code?: string;
}

export function InfoButton({ title, description, code }: InfoButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-1 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
        title="Help"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                {title}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {description}
              </p>
              
              {code && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Example Message</p>
                  <pre className="bg-gray-900 text-blue-300 p-4 rounded-lg text-xs font-mono overflow-x-auto border border-gray-800 shadow-inner">
                    {code}
                  </pre>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 text-right">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-shadow shadow-sm"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
