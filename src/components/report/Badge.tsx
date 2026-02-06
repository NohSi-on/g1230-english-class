import { motion } from 'framer-motion';

type BadgeLevel = 'JEUS' | 'TOP' | 'ARDOR';

interface BadgeProps {
    level: BadgeLevel;
    size?: 'sm' | 'md' | 'lg';
}

export const Badge = ({ level, size = 'md' }: BadgeProps) => {
    // Map levels to filename. I will place the files in /public/badges/
    const badgeImages = {
        JEUS: '/badges/badge_jeus.png',
        TOP: '/badges/badge_top.png',
        ARDOR: '/badges/badge_ardor.png'
    };

    const sizeClasses = {
        sm: 'w-16 h-16', // Slightly larger for image visibility
        md: 'w-32 h-32',
        lg: 'w-48 h-48'
    };

    return (
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className={`relative flex flex-col items-center justify-center`}
        >
            <div className={`${sizeClasses[size || 'md']} relative drop-shadow-2xl filter`}>
                <img
                    src={badgeImages[level]}
                    alt={`${level} Badge`}
                    className="w-full h-full object-contain"
                    style={{ mixBlendMode: 'screen' }} // Hides black background
                />
            </div>
            {/* Optional text label below if needed, but the badge text is inside the image now */}
            {/* Keeping it simple as the user requested "Use this badge" which implies the image is self-sufficient */}
        </motion.div>
    );
};
