<h1 align="center">SOFTRIDE</h1>

<p align="center">
  <em>Empowering seamless, safe, and accelerated journeys.</em>
</p>

<p align="center">
  <img alt="last commit" src="https://img.shields.io/github/last-commit/K0Konut/Softride?style=for-the-badge">
  <img alt="TypeScript" src="https://img.shields.io/github/languages/top/K0Konut/Softride?style=for-the-badge&label=typescript">
  <img alt="languages" src="https://img.shields.io/github/languages/count/K0Konut/Softride?style=for-the-badge&label=languages">
</p>

<p align="center">
  Built with the tools and technologies:
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  <img alt="Capacitor" src="https://img.shields.io/badge/Capacitor-119EFF?style=for-the-badge&logo=capacitor&logoColor=white" />
  <img alt="Mapbox" src="https://img.shields.io/badge/Mapbox-000000?style=for-the-badge&logo=mapbox&logoColor=white" />
  <img alt="GitHub Actions" src="https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white" />
  <img alt="ESLint" src="https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Quickstart](#quickstart)
- [Getting Started](#getting-started)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Testing](#testing)
- [Mobile Build](#mobile-build)
- [Documentation](#documentation)

---

## Overview

SoftRide is a navigation-focused application that helps build and run **high-performance, cross-platform bike navigation** experiences.  
It combines a modern React + TypeScript front end with native mobile capabilities via Capacitor, Mapbox routing, and safety-oriented features such as fall detection.

Why SoftRide?
- 🎯 **Modular Architecture**
- 🚀 **Fast Development**
- 🗺️ **Geospatial & Routing Utilities**
- 🛡️ **Safety & Emergency Features**
- 📱 **Cross-Platform Support**
- 🧰 **Developer Friendly**

## Quickstart

For contributors who want to run the app fast:

```bash
git clone https://github.com/K0Konut/Softride.git
cd Softride
npm install
cp .env.example .env
# Edit .env and set VITE_MAPBOX_TOKEN
npm run dev
```

Notes:
- Map features require `VITE_MAPBOX_TOKEN`.
- Email alerts are optional and require EmailJS keys.

## Getting Started

## Prerequisites

- Node.js LTS
- npm (or pnpm/yarn if you adapt commands)
- Mapbox account (token required for map/routing)
- Android Studio (optional, for Android builds)
- Xcode (optional, macOS only, for iOS builds)

## Installation

1. `git clone https://github.com/K0Konut/Softride.git`
2. `cd Softride`
3. `npm install`
4. `cp .env.example .env`
5. Set `VITE_MAPBOX_TOKEN` in `.env`
6. `npm run dev`

## Usage

- Go to the map screen and search for a destination.
- Select a destination to calculate safe routes.
- Start navigation to follow guidance with live ETA and off-route detection.
- Configure fall detection and emergency contact in Settings.

## Testing

- `npm run lint`
- `npm run typecheck`

## Mobile Build

1. `npm run build`
2. `npm run cap:sync`
3. `npm run cap:open:android` or `npm run cap:open:ios`

Capacitor config: `capacitor.config.ts` (appId `com.softride.app`).

## Documentation

Full documentation is available in `DOCUMENTATION.md`.
