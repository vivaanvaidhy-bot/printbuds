# BuildBuddy3D

BuildBuddy3D is a simple 3D printing hobby shop app made for a 9-year-old maker project.

It helps kids and parents:

- save filament colors
- save 3D toy designs
- add printed inventory
- take customer order requests
- record event sales
- track sold, free, and broken items

The app is designed to work on phones, iPads, and laptops.

## What the app does

BuildBuddy3D has two main sides:

- Customer side
  - browse available 3D toys
  - choose a color
  - send an order request

- Dashboard side
  - add filament colors
  - add 3D designs
  - add printed inventory
  - record event sales
  - review reports

## Dashboard flow

The dashboard is organized into 5 steps:

1. Colors
2. Designs
3. Printed inventory
4. Orders and sales
5. Reports

Main pages:

- `index.html` - customer order page
- `dashboard.html` - admin / kid dashboard
- `colors.html` - filament color library
- `designs.html` - design library
- `inventory.html` - printed toy inventory
- `orders_admin.html` - website orders and event sales
- `reports.html` - business reports

## Pricing model

The pricing model was simplified to make it easier for kids.

### Color pricing

Each color has an extra dollar amount:

- Regular color = +$0
- Premium color = +$1
- Glow / fancy color = +$2

The app lets you type the extra amount directly for each color.

Example:

- Red = `0`
- Silk rainbow = `1`
- Glow green = `2`

### Design pricing

Designs use a simple size catalog:

- Small = $5
- Medium = $7
- Large = $9

This is easier than setting a separate custom price for every design and color combination.

### Inventory pricing

Printed inventory pricing is based on:

- design base price
- plus color extra price

## Event selling

The Orders and Sales page includes a simple event selling section.

Kids can:

- choose a toy
- choose quantity
- mark it as:
  - Sold
  - Free
  - Broken

When they do that:

- a record is saved
- inventory is reduced right away

## Customer ordering

Customers can:

- choose a design
- choose from listed colors
- enter name
- enter email or phone
- send an order request

The customer page now shows clearer success and error messages when an order fails.

## Image handling

Images were updated to use smaller display sizes and smaller saved upload sizes.

### Display updates

- color and design cards use smaller thumbnails
- inventory previews are smaller
- customer product cards are smaller

### Storage updates

Uploaded design and color images are resized before saving:

- max size about `640 x 640`
- compressed JPEG output

This reduces storage use and improves performance.

## Data storage

The app supports two modes:

### 1. Shared mode with Supabase

If `supabase-config.js` contains a valid URL and anon key, the app uses Supabase.

### 2. Browser-only mode

If the Supabase values are blank, the app falls back to browser storage on that device only.

## Supabase tables

The app uses these tables:

- `color_library`
- `design_library`
- `inventory_items`
- `customer_orders`
- `sale_events`

### Current shared fields

#### `color_library`

- `id`
- `name`
- `photo`
- `extra_price`
- `created_at`

#### `design_library`

- `id`
- `name`
- `photo`
- `size_category`
- `base_price`
- `created_at`

#### `inventory_items`

- `id`
- `name`
- `qty`
- `price`
- `photo`
- `variants`
- `created_at`

#### `customer_orders`

- `id`
- `product_id`
- `product_name`
- `qty`
- `color`
- `customer_name`
- `contact`
- `note`
- `status`
- `created_at`

#### `sale_events`

- `id`
- `product_id`
- `product_name`
- `qty`
- `price`
- `color`
- `buyer`
- `record_type`
- `occurred_on`
- `created_at`

## Important Supabase note

If you are using shared DB mode, make sure the latest schema changes are also applied in Supabase.

Run the SQL from:

- `supabase/schema.sql`

Also see:

- `supabase/README.md`

## How to connect Supabase

1. Open your Supabase project
2. Run `supabase/schema.sql`
3. Open **Project Settings > API**
4. Copy:
   - project URL
   - anon / publishable key
5. Paste them into `supabase-config.js`

## iPad usage

This app can be used on iPad without publishing to the App Store.

Recommended setup:

1. Host the app on HTTPS
2. Open it in Safari on iPad
3. Use **Add to Home Screen**

That gives a simple app-like experience without creating a native App Store app.

### iPad notes

- camera and gallery upload work through file inputs
- Safari and Home Screen caching can sometimes keep old files
- if the iPad looks outdated, clear cache or remove and re-add the Home Screen app

## Project structure

Main front-end structure:

- `assets/css/`
  - `base.css`
  - `customer.css`
  - `admin.css`

- `assets/js/models/`
  - `defaults.js`
  - `mappers.js`

- `assets/js/lib/`
  - `storage.js`
  - `images.js`

- `assets/js/api/`
  - `client.js`
  - `index.js`

- `assets/js/app/`
  - `admin-common.js`
  - `customer.js`

## Main updates completed

This repo has been updated with:

- BuildBuddy3D branding
- cleaner folder structure
- shared CSS files
- shared API layer
- CRUD support for:
  - colors
  - designs
  - inventory
  - orders
  - sales records
- event sale flow
- customer order flow improvements
- image resize and compression
- smaller image previews
- simpler pricing model

## Current branch notes

This project has gone through several UI and pricing simplifications to make it easier for a child to manage.

If something looks missing:

- check whether the DB schema was updated
- check whether Safari or iPad is using cached files
- confirm the site is loading the newest deployed branch or version

## Goal

BuildBuddy3D is meant to be:

- simple for kids
- useful for parents
- easy to run on iPad
- good for learning 3D printing and beginner business ideas
