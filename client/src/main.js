import App from './App.svelte';

const app = new App({
	target: document.body, // Mount to the body or a specific element
	props: {
		// You can pass props to your App component here if needed
	}
});

export default app;

