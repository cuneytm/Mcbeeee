/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#0f0f11', // Deep dark
                surface: '#18181b', // Slightly lighter
                primary: '#3b82f6', // Blue
                danger: '#ef4444',
                success: '#22c55e',
            }
        },
    },
    plugins: [],
}
