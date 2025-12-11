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
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Usage](#usage)
  - [Testing](#testing)

---

## Overview

SoftRide is a navigation-focused application that helps build and run **high-performance, cross-platform bike navigation** experiences.  
It combines a modern React + TypeScript front end with native mobile capabilities via Capacitor, Mapbox routing, and safety-oriented features such as fall detection.

### Why SoftRide?

SoftRide aims to make it easier to develop **responsive, safety-aware navigation apps** with real-time location and routing.  
Some of the core ideas are:

- 🎯 **Modular Architecture**  
  Clearly separated features (map, routing, navigation, fall detection) with Zustand stores and services to keep the project scalable and maintainable.

- 🚀 **Fast Development**  
  Vite, React, TypeScript, and Tailwind CSS provide a fast feedback loop and a strongly typed, modern frontend stack.

- 🗺️ **Geospatial & Routing Utilities**  
  Deep integration with Mapbox APIs for bike-friendly routing, alternative paths, geocoding, and route geometry helpers (snap to route, distance to route, ETA, etc.).

- 🛡️ **Safety & Emergency Features**  
  Includes primitives for fall detection, countdown before alert, haptics, and local notifications to enhance rider safety.

- 📱 **Cross-Platform Support**  
  Runs as a web app and can be bundled to Android/iOS using Capacitor, bridging web code with native capabilities (GPS, haptics, notifications).

- 🧰 **Developer Friendly**  
  Comes with ESLint, TypeScript strictness, GitHub Actions (lint / typecheck / build), and debug utilities (GPS quality pill, fall debug panel) to keep the app stable as it grows.

---

## Getting Started

### Prerequisites

This project assumes you have the following installed:

- **Programming Language:** TypeScript (via Node.js toolchain)
- **Runtime:** Node.js (LTS recommended)
- **Package Manager:** `npm` (ou `pnpm`/`yarn` si tu adaptes les commandes)
- **Mobile tooling (optionnel mais recommandé) :**
  - Android Studio (AVD) pour tester sur Android
  - Xcode / simulators pour tester sur iOS (si tu es sur macOS)
- **Mapbox account:** une clé d’API Mapbox valide pour la carte, le routing et le geocoding.

---

### Installation

Build SoftRide from source and install dependencies.

1. **Clone the repository :**

   ```bash
   git clone https://github.com/K0Konut/Softride.git
