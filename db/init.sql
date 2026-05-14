-- ============================================================
-- Theatre Booking System - Database Schema
-- CN6035 Mobile & Distributed Systems
-- Target: MariaDB 11.x (utf8mb4)
-- ============================================================

CREATE DATABASE IF NOT EXISTS theatre_booking
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE theatre_booking;

-- Drop in reverse dependency order (idempotent re-runs)
DROP TABLE IF EXISTS reservation_seats;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS seats;
DROP TABLE IF EXISTS showtimes;
DROP TABLE IF EXISTS shows;
DROP TABLE IF EXISTS theatres;
DROP TABLE IF EXISTS users;

-- ------------------------------------------------------------
-- USERS
-- password_hash is NULL for users that authenticate via OIDC
-- external_id holds the Keycloak `sub` claim
-- ------------------------------------------------------------
CREATE TABLE users (
  user_id        BIGINT       NOT NULL AUTO_INCREMENT,
  name           VARCHAR(255) NOT NULL,
  email          VARCHAR(255) NOT NULL,
  password_hash  VARCHAR(255) NULL,
  external_id    VARCHAR(255) NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_external (external_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- THEATRES
-- ------------------------------------------------------------
CREATE TABLE theatres (
  theatre_id  BIGINT       NOT NULL AUTO_INCREMENT,
  name        VARCHAR(255) NOT NULL,
  location    VARCHAR(255) NOT NULL,
  description TEXT         NULL,
  PRIMARY KEY (theatre_id),
  KEY idx_theatres_location (location),
  KEY idx_theatres_name (name)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- SHOWS  (a play that is hosted by a theatre)
-- ------------------------------------------------------------
CREATE TABLE shows (
  show_id      BIGINT       NOT NULL AUTO_INCREMENT,
  theatre_id   BIGINT       NOT NULL,
  title        VARCHAR(255) NOT NULL,
  description  TEXT         NULL,
  duration_min INT          NOT NULL,
  age_rating   VARCHAR(10)  NULL,
  PRIMARY KEY (show_id),
  KEY idx_shows_theatre (theatre_id),
  KEY idx_shows_title (title),
  CONSTRAINT fk_shows_theatre
    FOREIGN KEY (theatre_id) REFERENCES theatres(theatre_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_shows_duration CHECK (duration_min > 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- SHOWTIMES  (specific date/time + hall + base price for a show)
-- ------------------------------------------------------------
CREATE TABLE showtimes (
  showtime_id    BIGINT       NOT NULL AUTO_INCREMENT,
  show_id        BIGINT       NOT NULL,
  start_datetime DATETIME     NOT NULL,
  hall           VARCHAR(100) NOT NULL,
  base_price     DECIMAL(8,2) NOT NULL,
  PRIMARY KEY (showtime_id),
  KEY idx_showtimes_show (show_id),
  KEY idx_showtimes_start (start_datetime),
  CONSTRAINT fk_showtimes_show
    FOREIGN KEY (show_id) REFERENCES shows(show_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_showtimes_price CHECK (base_price >= 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- SEATS  (every physical seat for every showtime, with status)
-- One row per (showtime, row, number). Generated when a
-- showtime is created.
-- ------------------------------------------------------------
CREATE TABLE seats (
  seat_id     BIGINT      NOT NULL AUTO_INCREMENT,
  showtime_id BIGINT      NOT NULL,
  row_label   VARCHAR(5)  NOT NULL,
  seat_number INT         NOT NULL,
  category    VARCHAR(50) NOT NULL DEFAULT 'standard',
  status      ENUM('available','reserved','sold') NOT NULL DEFAULT 'available',
  PRIMARY KEY (seat_id),
  UNIQUE KEY uq_seats_position (showtime_id, row_label, seat_number),
  KEY idx_seats_status (showtime_id, status),
  CONSTRAINT fk_seats_showtime
    FOREIGN KEY (showtime_id) REFERENCES showtimes(showtime_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- RESERVATIONS  (header)
-- One reservation = one user + one showtime + N seats
-- ------------------------------------------------------------
CREATE TABLE reservations (
  reservation_id BIGINT        NOT NULL AUTO_INCREMENT,
  user_id        BIGINT        NOT NULL,
  showtime_id    BIGINT        NOT NULL,
  total_price    DECIMAL(10,2) NOT NULL,
  status         ENUM('active','cancelled') NOT NULL DEFAULT 'active',
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (reservation_id),
  KEY idx_reservations_user (user_id),
  KEY idx_reservations_showtime (showtime_id),
  CONSTRAINT fk_reservations_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reservations_showtime
    FOREIGN KEY (showtime_id) REFERENCES showtimes(showtime_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_reservations_total CHECK (total_price >= 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- RESERVATION_SEATS  (N:M between reservations and seats)
-- A seat can appear in at most one ACTIVE reservation;
-- enforced at app layer via transaction + SELECT ... FOR UPDATE.
-- ------------------------------------------------------------
CREATE TABLE reservation_seats (
  reservation_id BIGINT NOT NULL,
  seat_id        BIGINT NOT NULL,
  PRIMARY KEY (reservation_id, seat_id),
  KEY idx_resseat_seat (seat_id),
  CONSTRAINT fk_resseat_reservation
    FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_resseat_seat
    FOREIGN KEY (seat_id) REFERENCES seats(seat_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;
