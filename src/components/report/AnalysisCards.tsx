import { motion } from 'framer-motion';
import { Trophy, AlertCircle, ChevronRight, BookOpen } from 'lucide-react';

interface CardProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    delay?: number;
}

const BaseCard: React.FC<CardProps & { icon: React.ReactNode }> = ({
    title, subtitle, children, delay = 0, icon
}) => (
    <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay, duration: 0.5 }}
        className="py-2 mb-1"
    >
        <div className="flex items-center gap-2 mb-1.5 border-b border-white/5 pb-1">
            <div className="text-inherit opacity-70">
                {icon}
            </div>
            <div>
                <h3 className="text-white font-bold text-[13px] leading-tight">
                    {title}
                </h3>
                {subtitle && <p className="text-slate-500 text-[9px] uppercase font-bold tracking-tight">{subtitle}</p>}
            </div>
        </div>
        <div className="px-0.5">
            {children}
        </div>
    </motion.div>
);

export const StrengthCard: React.FC<{ skill: string, comment: string }> = ({ skill, comment }) => (
    <BaseCard
        title={skill}
        subtitle="Excellent Performance"
        icon={<Trophy size={14} className="text-emerald-400" />}
        delay={0.1}
    >
        <p className="text-slate-200 text-xs leading-relaxed font-medium">{comment}</p>
    </BaseCard>
);

export const WeaknessCard: React.FC<{
    concept: string,
    errorRate: number,
    prescription: string,
    workbookLink?: string
}> = ({ concept, prescription, workbookLink }) => (
    <BaseCard
        title={concept}
        subtitle="Requires Attention"
        icon={<AlertCircle size={14} className="text-rose-400" />}
        delay={0.2}
    >
        <div className="space-y-2">
            <div>
                <p className="text-slate-200 text-xs leading-relaxed font-medium">{prescription}</p>
            </div>

            {workbookLink && (
                <button className="w-full py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg flex items-center justify-center gap-2 text-white/50 text-[10px] font-medium transition-colors">
                    <BookOpen size={12} />
                    Recommended Practice
                    <ChevronRight size={10} className="opacity-40" />
                </button>
            )}
        </div>
    </BaseCard>
);
