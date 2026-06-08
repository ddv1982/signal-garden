# Signal Garden Privacy Policy Draft

Last updated: June 6, 2026

This is a draft privacy policy for the Signal Garden prototype. It should be reviewed before any public beta or store submission.

## What Signal Garden Is

Signal Garden is a gentle self-reflection app where a warm little pet helps you notice inner signals, soften heavy labels, reconnect with your dreams, and grow tiny compassionate actions in a visual garden.

Signal Garden is not therapy, diagnosis, medical advice, crisis support, or productivity coaching. If you are in immediate danger or need urgent help, contact local emergency services or a qualified crisis service.

## Current Prototype Data Model

The current prototype is local-first. It does not use accounts, cloud sync, analytics, or a backend service.

Signal Garden stores these items in the current browser:

- Reflection seeds created from completed lens journeys.
- The current unfinished lens journey draft and local lens profile.
- App settings, including the reduced-motion preference.

Reflection seeds, lens journey drafts, profile choices, and settings are stored through browser `localStorage`. The Phaser garden reads the current React state and does not keep a separate game snapshot.

## Export And Delete Controls

The Settings screen includes local data controls:

- Export Seed Data creates a downloadable JSON copy of saved reflection seeds.
- Delete Seeds clears saved reflection seeds from browser `localStorage`.
- Reset Lens Profile clears the local lens profile and any unfinished lens journey draft.

Deleting app seeds does not remove files that were already exported or shared outside Signal Garden.

## No Cloud Sync In This Prototype

Because the prototype is local-only, data is not automatically backed up or restored across devices. Clearing browser storage, changing browsers, or using a different device may remove or hide prototype data.

## Future Services

If a future beta adds crash reporting, analytics, account login, cloud sync, or any external service, this policy must be updated before release. Any added service should collect the minimum data needed and clearly explain what is collected, why, and how users can control it.

## Contact

Add project contact details before beta distribution.
