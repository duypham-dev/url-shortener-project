import { ArrowLeft, Lock, Crown } from "lucide-react";

const PlanGatedOverlay = ({ onBack, onUpgrade }: { onBack: () => void, onUpgrade: () => void }) => (
  <div className="max-w-2xl mx-auto py-8 px-4 sm:px-0">
    <button
      onClick={onBack}
      className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 transition-colors"
    >
      <ArrowLeft size={16} strokeWidth={2.5} /> Back to list
    </button>
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
      <div className="p-8 filter blur-[6px] opacity-40 pointer-events-none select-none">
         {/* Skeleton UI mờ ở phía sau */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="h-6 bg-slate-200 rounded-md w-40 mb-2"></div>
            <div className="h-4 bg-slate-100 rounded-md w-64"></div>
          </div>
          <div className="h-10 bg-slate-100 rounded-lg w-28"></div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="h-24 border border-slate-100 bg-slate-50/50 rounded-lg"></div>
          <div className="h-24 border border-slate-100 bg-slate-50/50 rounded-lg"></div>
          <div className="h-24 border border-slate-100 bg-slate-50/50 rounded-lg"></div>
        </div>
        <div className="h-56 border border-slate-100 bg-slate-50/50 rounded-lg"></div>
      </div>
      
      <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
        <div className="text-center max-w-sm px-6 py-8 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50">
          <div className="w-14 h-14 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center mx-auto mb-5 shadow-sm">
            <Crown size={26} className="text-slate-800" strokeWidth={2} />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Nâng cấp để xem phân tích</h3>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed px-4">
            Mở khóa bảng điều khiển chi tiết, theo dõi lượt click theo thời gian thực và phân tích nguồn truy cập.
          </p>
          <button
            onClick={onUpgrade}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-all w-full justify-center"
          >
            <Lock size={16} strokeWidth={2} /> Mở khóa tính năng
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default PlanGatedOverlay;