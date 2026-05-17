import { Link as LinkIcon, HelpCircle, ChevronDown } from 'lucide-react';

export function Mockup() {
  return (
    <div className="relative max-w-5xl mx-auto w-full px-4 z-10 pb-32">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-2 overflow-hidden backdrop-blur-xl relative">
        {/* Fake UI Header */}
        <div className="bg-[#FAFAFA] rounded-xl border border-gray-100 h-[600px] flex overflow-hidden">
            {/* Fake Sidebar */}
            <div className="w-64 border-r border-gray-100 p-4 flex flex-col gap-6 hidden md:flex opacity-50 pointer-events-none">
              <div className="flex items-center gap-2 text-gray-400">
                <div className="w-6 h-6 rounded bg-gray-200"></div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="h-4 w-16 bg-gray-200 rounded"></div>
                  <div className="h-8 w-full bg-gray-100 rounded"></div>
                  <div className="h-8 w-full bg-gray-50 rounded"></div>
                  <div className="h-8 w-full bg-gray-50 rounded"></div>
                </div>
              </div>
            </div>
            
            {/* Fake Content area */}
            <div className="flex-1 p-6 relative flex justify-center pt-12 opacity-80 pointer-events-none">
                {/* Modal representation */}
                <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-2xl flex flex-col absolute top-12 z-20">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span className="text-gray-500 hover:text-gray-900 cursor-pointer">Links</span>
                      <span className="text-gray-400">/</span>
                      <div className="w-5 h-5 bg-black rounded-full flex place-items-center justify-center text-white">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                      <span>New link</span>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                    </button>
                  </div>
                  <div className="p-6 flex flex-col md:flex-row gap-8">
                     {/* Left Form */}
                     <div className="flex-1 space-y-6">
                        <div className="space-y-2">
                          <label className="flex items-center gap-1 text-sm font-medium text-gray-700">Destination URL <HelpCircle className="w-3.5 h-3.5 text-gray-400" /></label>
                          <input type="text" value="https://acme.com/announcements/new-feature-launch" readOnly className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 bg-white shadow-sm" />
                        </div>
                        <div className="space-y-2">
                          <label className="flex items-center gap-1 text-sm font-medium text-gray-700">Short link <HelpCircle className="w-3.5 h-3.5 text-gray-400" /></label>
                          <div className="flex">
                            <div className="border border-r-0 border-gray-200 rounded-l-lg px-3 py-2 text-sm text-gray-500 bg-gray-50">go.acme.com</div>
                            <input type="text" value="launch" readOnly className="flex-1 border border-gray-200 rounded-r-lg px-3 py-2 text-sm text-gray-600 bg-white" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="flex items-center gap-1 text-sm font-medium text-gray-700">Tags <HelpCircle className="w-3.5 h-3.5 text-gray-400" /></label>
                          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white">
                            <span className="flex items-center gap-1 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Blog</span>
                            <span className="flex items-center gap-1 bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Marketing</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="flex items-center gap-1 text-sm font-medium text-gray-700">Comments (optional) <HelpCircle className="w-3.5 h-3.5 text-gray-400" /></label>
                          <textarea placeholder="Add comments" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 bg-white min-h-[80px] placeholder:text-gray-400" readOnly />
                        </div>
                        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                           <label className="flex items-center gap-1 text-sm font-medium text-gray-700">Conversion Tracking <HelpCircle className="w-3.5 h-3.5 text-gray-400" /></label>
                           <div className="w-8 h-4 bg-blue-500 rounded-full relative">
                             <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div>
                           </div>
                        </div>
                     </div>
                     {/* Right Sidebar */}
                     <div className="w-64 space-y-6">
                       <div className="space-y-2">
                          <label className="flex items-center gap-1 text-sm font-medium text-gray-700">Folder</label>
                          <div className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm">
                            <div className="flex items-center gap-2 text-gray-600"><div className="w-4 h-4 bg-green-100 rounded border border-green-200 flex items-center justify-center"><div className="w-2 h-2 bg-green-500 rounded-sm"></div></div> Links</div>
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          </div>
                       </div>
                       <div className="space-y-2">
                         <label className="flex items-center justify-between w-full">
                           <span className="flex items-center gap-1 text-sm font-medium text-gray-700">QR Code <HelpCircle className="w-3.5 h-3.5 text-gray-400" /></span>
                           <div className="w-8 h-4 bg-gray-200 rounded-full relative"><div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"></div></div>
                         </label>
                         <div className="border border-gray-200 rounded-lg p-4 flex justify-center bg-gray-50/50">
                           <div className="w-24 h-24 bg-white border border-gray-200 rounded p-1">
                             <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=example" alt="QR Code" className="w-full h-full opacity-60" />
                           </div>
                         </div>
                       </div>
                       <div className="space-y-2">
                         <label className="flex items-center justify-between w-full">
                           <span className="flex items-center gap-1 text-sm font-medium text-gray-700">Custom Link Preview <HelpCircle className="w-3.5 h-3.5 text-gray-400" /></span>
                           <div className="w-8 h-4 bg-gray-200 rounded-full relative"><div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"></div></div>
                         </label>
                       </div>
                     </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-4 border-t border-gray-100 flex items-center justify-between rounded-b-xl">
                    <div className="flex gap-4 opacity-50">
                      <div className="h-4 w-12 bg-gray-200 rounded"></div>
                      <div className="h-4 w-16 bg-gray-200 rounded"></div>
                      <div className="h-4 w-14 bg-gray-200 rounded"></div>
                    </div>
                    <button className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium min-w-[100px] text-center">Create link</button>
                  </div>
                </div>
            </div>
        </div>
      </div>

      {/* Floating features card overlay */}
      <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl bg-[#222222] text-white rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl z-30">
        <div className="flex items-start md:items-center gap-4">
          <div className="bg-white/10 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
            <LinkIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg drop-shadow-sm">Short Links</h3>
            <p className="text-gray-300 text-sm md:text-base leading-snug">
              Create and manage short links at scale, with advanced features, folders, and role-based access control
            </p>
          </div>
        </div>
        <button className="bg-white text-black px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors whitespace-nowrap self-stretch md:self-auto">
          Learn more
        </button>
      </div>

    </div>
  );
}
