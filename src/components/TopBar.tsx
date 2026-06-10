import type { ActiveTheme, ThemePreference } from '../domain/theme';

export type Tab = 'home' | 'garden' | 'archive' | 'settings';

const tabs: Tab[] = ['home', 'garden', 'archive', 'settings'];

type TopBarProps = {
  activeTab: Tab;
  activeTheme: ActiveTheme;
  themePreference: ThemePreference;
  onSelectTab: (tab: Tab) => void;
  onSelectTheme: (preference: ThemePreference) => void;
};

export function TopBar({
  activeTab,
  activeTheme,
  themePreference,
  onSelectTab,
  onSelectTheme,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="app-brand">
        <span className="brand-mark" aria-hidden="true">
          SG
        </span>
        <div>
          <p className="eyebrow">Signal Garden</p>
          <span>A living garden for shifting perspective.</span>
        </div>
      </div>
      <div className="topbar-actions">
        <nav className="tabs" aria-label="Signal Garden sections">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? 'tab active' : 'tab'}
              aria-current={activeTab === tab ? 'page' : undefined}
              onClick={() => onSelectTab(tab)}
            >
              {tab[0].toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
        <div
          className="theme-toggle"
          data-testid="theme-toggle"
          role="group"
          aria-label={`Theme controls. Current theme is ${activeTheme}.`}
        >
          <button
            type="button"
            className={themePreference === 'light' ? 'theme-button active' : 'theme-button'}
            aria-label="Use light mode"
            aria-pressed={themePreference === 'light'}
            title="Use light mode"
            onClick={() => onSelectTheme('light')}
          >
            <SunIcon />
          </button>
          <button
            type="button"
            className={themePreference === 'dark' ? 'theme-button active' : 'theme-button'}
            aria-label="Use dark mode"
            aria-pressed={themePreference === 'dark'}
            title="Use dark mode"
            onClick={() => onSelectTheme('dark')}
          >
            <MoonIcon />
          </button>
          <button
            type="button"
            className={themePreference === 'system' ? 'theme-button active' : 'theme-button'}
            aria-label="Match system theme"
            aria-pressed={themePreference === 'system'}
            title="Match system theme"
            onClick={() => onSelectTheme('system')}
          >
            <AutoIcon />
          </button>
        </div>
      </div>
    </header>
  );
}

function SunIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M20.3 14.1a7.1 7.1 0 0 1-10.4-8 7.8 7.8 0 1 0 10.4 8Z" />
    </svg>
  );
}

function AutoIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
