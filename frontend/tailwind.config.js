import daisyui from "daisyui";
import daisyUIThemes from "daisyui/src/theming/themes";
/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			colors: {
				primary: {
					DEFAULT: 'var(--color-primary)',
					dark: 'var(--color-primary-dark)',
					light: 'var(--color-primary-light)',
				},
				secondary: {
					green: 'var(--color-secondary-green)',
					red: 'var(--color-secondary-red)',
					yellow: 'var(--color-secondary-yellow)',
					gray: 'var(--color-secondary-gray)',
				},
				background: {
					main: 'var(--color-bg-main)',
					card: 'var(--color-bg-card)',
					dark: 'var(--color-bg-dark)',
					light: 'var(--color-bg-light)',
				},
				text: {
					primary: 'var(--color-text-primary)',
					secondary: 'var(--color-text-secondary)',
					light: 'var(--color-text-light)',
					link: 'var(--color-text-link)',
					error: 'var(--color-text-error)',
				},
				border: {
					default: 'var(--color-border-default)',
					focus: 'var(--color-border-focus)',
					error: 'var(--color-border-error)',
				},
				input: {
					bg: 'var(--color-input-bg)',
					text: 'var(--color-input-text)',
					border: 'var(--color-input-border)',
					placeholder: 'var(--color-input-placeholder)',
				},
			},
			fontFamily: {
				primary: ['var(--font-primary)'],
				secondary: ['var(--font-secondary)'],
			},
			fontSize: {
				h1: 'var(--font-size-h1)',
				h2: 'var(--font-size-h2)',
				h3: 'var(--font-size-h3)',
				h4: 'var(--font-size-h4)',
				h5: 'var(--font-size-h5)',
				h6: 'var(--font-size-h6)',
				body: 'var(--font-size-body)',
				small: 'var(--font-size-small)',
				xs: 'var(--font-size-xs)',
			},
			lineHeight: {
				heading: 'var(--line-height-heading)',
				body: 'var(--line-height-body)',
			},
			spacing: {
				xs: 'var(--spacing-xs)',
				sm: 'var(--spacing-sm)',
				md: 'var(--spacing-md)',
				lg: 'var(--spacing-lg)',
				xl: 'var(--spacing-xl)',
				xxl: 'var(--spacing-xxl)',
			},
			borderRadius: {
				DEFAULT: 'var(--border-radius)',
				sm: 'var(--border-radius-sm)',
			},
			boxShadow: {
				DEFAULT: 'var(--box-shadow)',
			},
			transitionDuration: {
				DEFAULT: 'var(--transition-duration)',
			},
			transitionTimingFunction: {
				DEFAULT: 'var(--transition-timing)',
			},
		},
	},
	plugins: [daisyui],

	daisyui: {
		themes: [
			"light",
			{
				black: {
					...daisyUIThemes["black"],
					primary: "rgb(29, 155, 240)",
					secondary: "rgb(24, 24, 24)",
				},
			},
		],
	},
};
