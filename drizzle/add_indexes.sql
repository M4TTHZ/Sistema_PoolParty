-- ============================================================
-- Pool Party — Performance Indexes
-- Run once after pnpm drizzle-kit push
-- ============================================================

-- reservationDates: most queried by date and by reservationId
CREATE INDEX IF NOT EXISTS idx_res_dates_reservation
  ON reservationDates (reservationId);

CREATE INDEX IF NOT EXISTS idx_res_dates_date
  ON reservationDates (reservationDate);

-- reservationItems: frequently joined to reservations
CREATE INDEX IF NOT EXISTS idx_res_items_reservation
  ON reservationItems (reservationId);

CREATE INDEX IF NOT EXISTS idx_res_items_stock
  ON reservationItems (stockItemId);

-- reservations: filtered by status and clientId
CREATE INDEX IF NOT EXISTS idx_reservations_client
  ON reservations (clientId);

CREATE INDEX IF NOT EXISTS idx_reservations_status
  ON reservations (status);

-- clients: searched by cpfCnpj (already unique, but explicit index helps explain plans)
CREATE INDEX IF NOT EXISTS idx_clients_cpfcnpj
  ON clients (cpfCnpj);

-- stockItems: searched by name
CREATE INDEX IF NOT EXISTS idx_stock_name
  ON stockItems (name);

-- maintenances: filtered by date
CREATE INDEX IF NOT EXISTS idx_maintenances_date
  ON maintenances (maintenanceDate);

-- playgroundRentals: joined by reservationId
CREATE INDEX IF NOT EXISTS idx_playground_reservation
  ON playgroundRentals (reservationId);
