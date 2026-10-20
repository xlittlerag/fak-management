import { render } from 'preact';
import './index.css';
import { App } from './app.tsx';
import { initResponsiveTables } from './lib/responsive-tables';

render(<App />, document.getElementById('app')!);
initResponsiveTables();
