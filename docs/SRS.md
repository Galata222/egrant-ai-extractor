# Software Requirements Specification (SRS)

**Project Name:** eGrant AI Data Extraction Module (FUTURE MAKERS Hackathon)
**Date:** October 5, 2026
**Target Architecture:** Next.js (Frontend) + FastAPI / PyTorch (Backend)

## 1. Introduction

### 1.1 Purpose

This document defines the requirements for a standalone AI data extraction prototype designed for the eGrant platform. The system automates the extraction of structured data (IČO, dates, amounts, etc.) from uploaded documents (invoices, receipts, contracts) and maps them to eGrant's specific "tag" schema.

### 1.2 Scope

The prototype will feature a dual-stack architecture:

* **Backend (Python/FastAPI/PyTorch):** Handles document ingestion, tensor processing via a vision-language model (e.g., Hugging Face Donut), and strict mapping to eGrant tags.
* **Frontend (Next.js/React):** Provides the applicant upload interface and a split-screen "Human-in-the-loop" verification dashboard for grant managers.
* **Out of Scope:** Direct modification of eGrant's core codebase. The solution operates as a detachable module communicating via JSON.

### 1.3 Definitions and Acronyms

* **eGrant Tag:** The unique identifier/address for data fields in eGrant (e.g., `projekt.suma`, `dodavatel.ico`). This is the system's core contract.
* **Human-in-the-loop (HITL):** The requirement that AI extraction must always be verified and confirmed by a human manager before saving.
* **Zero-Hallucination Policy:** If the AI cannot confidently extract a data point, it must return `null` rather than guessing.

---

## 2. Overall Description

### 2.1 Product Perspective

The module acts as a smart middleware. An applicant uploads a document for their grant settlement (*vyúčtovanie*). Instead of the manager manually typing the invoice details into the eGrant JSON form, this module intercepts the file, extracts the data, pre-fills the form, and presents it to the manager for review.

### 2.2 User Characteristics

* **Grant Manager:** Non-technical, native Slovak speaker. Values simplicity, accuracy, and clear visual cues. Must not be exposed to complex AI mechanics.
* **Applicant:** End-user uploading the file. Might upload poor-quality mobile photos or crumpled receipts.

### 2.3 Key Dependencies & Constraints

* **Language:** All UI text and AI NLP processing must be optimized for the Slovak language.
* **Data Structure:** The final output *must* conform to eGrant's nested JSON tree structure and tag dictionary.
* **Environment:** Code must be submitted via a private Git repository with a comprehensive `README.md` by October 30, 2026 EOD.

---

## 3. Functional Requirements

### FR1: Document Upload Module

* **FR1.1:** The UI shall accept PDF, JPG, and PNG file formats via drag-and-drop or file browser.
* **FR1.2:** The system shall display a loading state (e.g., "Extrahujem údaje zo súboru...") while the backend processes the document.
* **FR1.3:** The system shall send the file payload to the FastAPI `/extract` endpoint via `FormData`.

### FR2: AI Extraction Pipeline (PyTorch)

* **FR2.1:** The backend shall utilize a Transformer-based Document AI model (e.g., Donut or LayoutLM) to perform key-value extraction directly from the image/PDF tensor.
* **FR2.2:** The model shall target core financial entities: Invoice Number, Supplier Name, Supplier IČO/DIČ, Date of Issue, Due Date, Total Amount without VAT, and Total Amount with VAT.
* **FR2.3:** The backend shall calculate a confidence score for each extracted field.
* **FR2.4 (Strict):** If the confidence score falls below a predefined threshold, or the entity is missing, the backend shall set the value to `null`.

### FR3: Tag Mapping Engine

* **FR3.1:** The backend shall include a mapping utility that translates generic AI outputs into exact eGrant tags (e.g., `vendor_id` -> `dodavatel.ico`).
* **FR3.2:** The mapping utility must support tabular data (e.g., iterating through receipt line items and mapping them to `TABLE_ITEM_STRING` and `TABLE_ITEM_CURRENCY` child tags).

### FR4: Manager Verification Dashboard (UX/UI)

* **FR4.1:** The frontend shall render a split-screen UI upon receiving the backend response.
* **FR4.2:** The left pane shall display the original uploaded document (PDF viewer or image renderer).
* **FR4.3:** The right pane shall display an editable eGrant form populated with the extracted values.
* **FR4.4:** The UI shall visually flag fields that are `null` (missing data) or have low confidence (e.g., yellow border, warning icon), requiring the manager's attention.
* **FR4.5:** The manager shall be able to manually edit any field.

### FR5: System Integration & Export

* **FR5.1:** The frontend shall feature a "Potvrdiť" (Confirm) button.
* **FR5.2:** Upon confirmation, the system shall compile the form state into a strictly validated JSON object conforming to the eGrant structural rules (Roots -> Sections -> Items -> Tags).

---

## 4. External Interface Requirements

### 4.1 User Interfaces

* Built using Next.js App Router, React, and Tailwind CSS.
* Must follow accessible design principles (high contrast, clear typography).
* All copy must be localized to Slovak (e.g., "Nahrať súbor", "Potvrdiť údaje", "Neznámy údaj - doplňte ručne").

### 4.2 Software Interfaces (API)

* **Frontend-to-Backend:** REST API communication over HTTP. Endpoint: `POST /extract`. Payload: `multipart/form-data`. Response: `application/json`.
* **Backend-to-eGrant (Conceptual Integration):** The final JSON payload generated by the frontend will theoretically be POSTed to an eGrant API endpoint (e.g., `POST /api/v1/applications/{id}/fill`).

---

## 5. Non-Functional Requirements

### 5.1 Usability (10% of Hackathon Score)

* The verification interface must ensure that verifying a document is significantly faster than typing it manually from scratch, even if the AI misses 20% of the fields.

### 5.2 Reliability & Trust (Crucial eGrant Criteria)

* **Zero Hallucinations:** The system's tolerance for invented data is 0%. A blank field requiring manual input is a successful fallback; an incorrect AI guess that makes it into a legal grant contract is a critical system failure.

### 5.3 Performance

* AI inference on the PyTorch backend should execute in under 15 seconds per page to prevent user drop-off.

### 5.4 Feasibility (20% of Hackathon Score)

* The Next.js + JSON API architecture must explicitly demonstrate how easily eGrant could embed this as an iFrame or React component without rewriting their monolithic backend.
