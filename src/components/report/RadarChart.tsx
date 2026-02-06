import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
);

interface SkillData {
    grammar: number;
    reading: number;
    listening: number;
    vocabulary: number;
    writing?: number;
}

interface RadarChartProps {
    currentData: SkillData;
    prevData?: SkillData;
}

export const AnalysisRadarChart: React.FC<RadarChartProps> = ({ currentData, prevData }) => {

    // Removed 'Speaking' as per request
    const labels = ['Grammar', 'Reading', 'Listening', 'Vocabulary', 'Writing'];

    // Map data to ordered array
    const getDataArray = (data: SkillData) => [
        data.grammar,
        data.reading,
        data.listening,
        data.vocabulary,
        data.writing || 0
    ];

    const data = {
        labels,
        datasets: [
            {
                label: 'This Month',
                data: getDataArray(currentData),
                backgroundColor: 'rgba(16, 185, 129, 0.2)', // Emerald-500 equivalent with opacity
                borderColor: '#10B981', // Emerald-500
                borderWidth: 2,
                pointBackgroundColor: '#10B981',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#10B981',
            },
            ...(prevData ? [{
                label: 'Last Month',
                data: getDataArray(prevData),
                backgroundColor: 'rgba(148, 163, 184, 0.2)', // Slate-400
                borderColor: '#94a3b8',
                borderWidth: 1,
                borderDash: [5, 5],
                pointBackgroundColor: '#94a3b8',
                pointBorderColor: '#fff',
                pointRadius: 3,
            }] : [])
        ],
    };

    const options = {
        scales: {
            r: {
                angleLines: {
                    display: true,
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                suggestedMin: 0,
                suggestedMax: 100,
                ticks: {
                    stepSize: 20,
                    backdropColor: 'transparent',
                    color: 'rgba(255, 255, 255, 0.5)',
                    font: {
                        size: 10
                    }
                },
                pointLabels: {
                    color: '#e2e8f0', // Slate-200
                    font: {
                        size: 11,
                        weight: 'bold' as const
                    }
                }
            },
        },
        plugins: {
            legend: {
                labels: {
                    color: '#e2e8f0',
                    font: {
                        size: 12
                    }
                }
            }
        },
        maintainAspectRatio: false
    };

    return (
        <div className="w-full h-[300px] relative">
            <Radar data={data} options={options} />
        </div>
    );
};
