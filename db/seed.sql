-- ============================================================
-- Seed data for demo & development
-- ============================================================

USE theatre_booking;

-- ---------- Users (one demo user with bcrypt-hashed password 'demo1234') ----------
INSERT INTO users (name, email, password_hash) VALUES
  ('Demo User', 'demo@example.com', '$2b$10$wH8.fY7Wq9YH8VQYxK1Tne8c2vXp1gqTjN9aF8gQ.eKqUO5VqK5Qa');

-- ---------- Theatres ----------
INSERT INTO theatres (name, location, description) VALUES
  ('Εθνικό Θέατρο',     'Αθήνα',       'Ιστορικό θέατρο στο κέντρο της Αθήνας'),
  ('Θέατρο Παλλάς',     'Αθήνα',       'Σύγχρονη σκηνή στο Σύνταγμα'),
  ('Θέατρο Βασιλικόν',  'Θεσσαλονίκη', 'Κεντρική σκηνή Θεσσαλονίκης');

-- ---------- Shows ----------
INSERT INTO shows (theatre_id, title, description, duration_min, age_rating) VALUES
  (1, 'Αντιγόνη',           'Τραγωδία του Σοφοκλή',                 110, '12+'),
  (1, 'Οιδίπους Τύραννος',  'Κλασική τραγωδία',                     120, '14+'),
  (2, 'Ονειρο Καλοκαιρινής Νύχτας', 'Κωμωδία του Σαίξπηρ',         130, 'All'),
  (3, 'Ο Βυσσινόκηπος',     'Δράμα του Τσέχωφ',                     140, '12+');

-- ---------- Showtimes ----------
INSERT INTO showtimes (show_id, start_datetime, hall, base_price) VALUES
  (1, '2026-06-15 20:30:00', 'Κεντρική Σκηνή', 18.00),
  (1, '2026-06-16 20:30:00', 'Κεντρική Σκηνή', 18.00),
  (2, '2026-06-17 21:00:00', 'Κεντρική Σκηνή', 22.00),
  (3, '2026-06-18 21:00:00', 'Main Stage',     25.00),
  (4, '2026-06-20 20:00:00', 'Αίθουσα Α',      20.00);

-- ---------- Seats: 5 rows × 10 seats for every showtime ----------
-- Rows A-B = premium (×1.5), Rows C-E = standard
DELIMITER //
CREATE PROCEDURE seed_seats()
BEGIN
  DECLARE st_id BIGINT;
  DECLARE done INT DEFAULT 0;
  DECLARE cur CURSOR FOR SELECT showtime_id FROM showtimes;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO st_id;
    IF done = 1 THEN LEAVE read_loop; END IF;

    INSERT INTO seats (showtime_id, row_label, seat_number, category) VALUES
      (st_id,'A',1,'premium'),(st_id,'A',2,'premium'),(st_id,'A',3,'premium'),(st_id,'A',4,'premium'),(st_id,'A',5,'premium'),
      (st_id,'A',6,'premium'),(st_id,'A',7,'premium'),(st_id,'A',8,'premium'),(st_id,'A',9,'premium'),(st_id,'A',10,'premium'),
      (st_id,'B',1,'premium'),(st_id,'B',2,'premium'),(st_id,'B',3,'premium'),(st_id,'B',4,'premium'),(st_id,'B',5,'premium'),
      (st_id,'B',6,'premium'),(st_id,'B',7,'premium'),(st_id,'B',8,'premium'),(st_id,'B',9,'premium'),(st_id,'B',10,'premium'),
      (st_id,'C',1,'standard'),(st_id,'C',2,'standard'),(st_id,'C',3,'standard'),(st_id,'C',4,'standard'),(st_id,'C',5,'standard'),
      (st_id,'C',6,'standard'),(st_id,'C',7,'standard'),(st_id,'C',8,'standard'),(st_id,'C',9,'standard'),(st_id,'C',10,'standard'),
      (st_id,'D',1,'standard'),(st_id,'D',2,'standard'),(st_id,'D',3,'standard'),(st_id,'D',4,'standard'),(st_id,'D',5,'standard'),
      (st_id,'D',6,'standard'),(st_id,'D',7,'standard'),(st_id,'D',8,'standard'),(st_id,'D',9,'standard'),(st_id,'D',10,'standard'),
      (st_id,'E',1,'standard'),(st_id,'E',2,'standard'),(st_id,'E',3,'standard'),(st_id,'E',4,'standard'),(st_id,'E',5,'standard'),
      (st_id,'E',6,'standard'),(st_id,'E',7,'standard'),(st_id,'E',8,'standard'),(st_id,'E',9,'standard'),(st_id,'E',10,'standard');
  END LOOP;
  CLOSE cur;
END//
DELIMITER ;

CALL seed_seats();
DROP PROCEDURE seed_seats;
