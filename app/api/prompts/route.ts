import { NextResponse } from "next/server";

export async function GET() {
    const questionBank = [
        {
            slug: "productivity_execution",
            title: "Ejecución y Productividad",
            icon: "Zap",
            color: "from-orange-500 to-amber-500",
            questions: [
                { id: "p1", text: "¿Cuál fue la \"Victoria Maestra\" de hoy que movió la aguja en mis proyectos?" },
                { id: "p2", text: "Si hoy fuera el último día de mi \"Misión 60X\", ¿estaría orgulloso de mi esfuerzo?" },
                { id: "p3", text: "¿Qué distracción me quitó más energía hoy y cómo la eliminaré mañana?" },
                { id: "p4", text: "¿Actué hoy como la persona que quiero llegar a ser, o me dejé llevar por viejos hábitos?" }
            ]
        },
        {
            slug: "wealth_building",
            title: "Finanzas e Inversión",
            icon: "Wallet",
            color: "from-emerald-500 to-teal-500",
            questions: [
                { id: "w1", text: "¿Qué acción real tomé hoy para acercarme a mi libertad financiera?" },
                { id: "w2", text: "¿Detecté alguna oportunidad de inversión o mejora en mi patrimonio actual?" },
                { id: "w3", text: "¿Mi gasto de hoy fue una inversión en mi futuro o una gratificación instantánea?" },
                { id: "w4", text: "¿Qué decisión en mi agencia de autos podría escalar mis ingresos este mes?" }
            ]
        },
        {
            slug: "identity_mindset",
            title: "Identidad y Mentalidad",
            icon: "Brain",
            color: "from-indigo-500 to-purple-500",
            questions: [
                { id: "m1", text: "¿En qué momento del día sentí que mis límites me frenaban y cómo reaccioné?" },
                { id: "m2", text: "¿Qué conversación difícil evité hoy y por qué?" },
                { id: "m3", text: "Describe un momento de hoy donde demostré una \"mentalidad inquebrantable\"." },
                { id: "m4", text: "¿Qué creencia sobre mí mismo desafié hoy?" }
            ]
        },
        {
            slug: "purpose_legacy",
            title: "Propósito y Legado",
            icon: "Heart",
            color: "from-rose-500 to-pink-500",
            questions: [
                { id: "l1", text: "¿De qué manera serví o ayudé a mi familia hoy?" },
                { id: "l2", text: "¿Qué semilla planté hoy que dará frutos en la vida de mis hijos?" },
                { id: "l3", text: "Si alguien escribiera mi biografía basándose solo en mis acciones de hoy, ¿qué diría?" },
                { id: "l4", text: "¿Por qué me siento profundamente agradecido en este momento?" }
            ]
        },
        {
            slug: "peak_performance",
            title: "Alto Rendimiento y Salud",
            icon: "Activity",
            color: "from-cyan-500 to-blue-500",
            questions: [
                { id: "h1", text: "¿Cómo respondió mi cuerpo al entrenamiento de hoy? (Nota de voz recomendada)" },
                { id: "h2", text: "¿Qué señales de fatiga o potencia identifiqué?" },
                { id: "h3", text: "¿Mi nutrición y descanso estuvieron alineados con mi próximo gran desafío físico?" }
            ]
        }
    ];

    return NextResponse.json(questionBank);
}
