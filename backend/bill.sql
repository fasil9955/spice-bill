CREATE DATABASE  IF NOT EXISTS `spices_billing_system` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `spices_billing_system`;
-- MySQL dump 10.13  Distrib 8.0.36, for Win64 (x86_64)
--
-- Host: localhost    Database: spices_billing_system
-- ------------------------------------------------------
-- Server version	8.0.36

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `attendance`
--

DROP TABLE IF EXISTS `attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance` (
  `attendance_id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(200) NOT NULL,
  `employee_id` int NOT NULL,
  `employee_code` varchar(50) NOT NULL,
  `employee_name` varchar(200) NOT NULL,
  `attendance_date` date NOT NULL,
  `attendance_time` time NOT NULL,
  `attendance_type` enum('CHECK_IN','CHECK_OUT','BREAK_IN','BREAK_OUT') DEFAULT 'CHECK_IN',
  `verification_mode` varchar(50) DEFAULT NULL,
  `status` enum('PRESENT','ABSENT','LATE','EARLY_LEAVE','HALF_DAY') DEFAULT 'PRESENT',
  `remarks` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`attendance_id`),
  KEY `idx_company_name` (`company_name`),
  KEY `idx_employee_id` (`employee_id`),
  KEY `idx_employee_code` (`employee_code`),
  KEY `idx_attendance_date` (`attendance_date`),
  CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `b2b_customers`
--

DROP TABLE IF EXISTS `b2b_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `b2b_customers` (
  `customer_id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(200) NOT NULL,
  `customer_name` varchar(200) NOT NULL,
  `gst_number` varchar(50) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `state_code` varchar(10) DEFAULT NULL,
  `company_name_in_invoice` varchar(200) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `billing_address` varchar(500) DEFAULT NULL,
  `shipping_address` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `gst_number` (`gst_number`),
  KEY `idx_gst_number` (`gst_number`),
  KEY `idx_company_name` (`company_name`),
  KEY `idx_phone` (`phone`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) NOT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `category_name` (`category_name`),
  KEY `idx_category_name` (`category_name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `daily_sales_report`
--

DROP TABLE IF EXISTS `daily_sales_report`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `daily_sales_report` (
  `report_id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(200) NOT NULL,
  `report_date` date NOT NULL,
  `total_invoices` int DEFAULT '0',
  `total_sales` decimal(10,2) DEFAULT '0.00',
  `total_tax` decimal(10,2) DEFAULT '0.00',
  `total_discount` decimal(10,2) DEFAULT '0.00',
  `total_items_sold` int DEFAULT '0',
  `cash_sales` decimal(10,2) DEFAULT '0.00',
  `card_sales` decimal(10,2) DEFAULT '0.00',
  `upi_sales` decimal(10,2) DEFAULT '0.00',
  `mixed_sales` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`report_id`),
  UNIQUE KEY `unique_company_report_date` (`company_name`,`report_date`),
  KEY `idx_company_name` (`company_name`),
  KEY `idx_report_date` (`report_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees` (
  `employee_id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(200) NOT NULL,
  `employee_code` varchar(50) NOT NULL,
  `employee_name` varchar(200) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `designation` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `aadhar_number` varchar(12) DEFAULT NULL,
  `photo` varchar(500) DEFAULT NULL,
  `aadhar_document` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`employee_id`),
  UNIQUE KEY `unique_company_employee_code` (`company_name`,`employee_code`),
  UNIQUE KEY `UKdd7pk2plsvdugxgyurcu6ha9m` (`company_name`,`employee_code`),
  KEY `idx_company_name` (`company_name`),
  KEY `idx_employee_code` (`employee_code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `invoice_items`
--

DROP TABLE IF EXISTS `invoice_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_items` (
  `item_id` int NOT NULL AUTO_INCREMENT,
  `invoice_id` int NOT NULL,
  `product_id` int NOT NULL,
  `product_name` varchar(200) NOT NULL,
  `barcode` varchar(100) DEFAULT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `discount_percent` decimal(5,2) DEFAULT '0.00',
  `discount_amount` decimal(10,2) DEFAULT '0.00',
  `total_price` decimal(10,2) NOT NULL,
  `hsn_code` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`item_id`),
  KEY `idx_invoice_id` (`invoice_id`),
  KEY `idx_product_id` (`product_id`),
  CONSTRAINT `invoice_items_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`invoice_id`) ON DELETE CASCADE,
  CONSTRAINT `invoice_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `invoice_id` int NOT NULL AUTO_INCREMENT,
  `invoice_number` varchar(50) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(10,2) DEFAULT '0.00',
  `discount_amount` decimal(10,2) DEFAULT '0.00',
  `total_amount` decimal(10,2) NOT NULL,
  `payment_method` enum('CASH','CARD','UPI','MIXED') DEFAULT 'CASH',
  `cash_amount` decimal(10,2) DEFAULT '0.00',
  `card_amount` decimal(10,2) DEFAULT '0.00',
  `upi_amount` decimal(10,2) DEFAULT '0.00',
  `cashier_id` int NOT NULL,
  `status` enum('ACTIVE','CANCELLATION_REQUESTED','CANCELLED') NOT NULL,
  `cancellation_requested_at` timestamp NULL DEFAULT NULL,
  `cancellation_reason` text,
  `invoice_type` varchar(10) DEFAULT 'B2C',
  `b2b_customer_id` int DEFAULT NULL,
  `eway_bill_number` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`invoice_id`),
  UNIQUE KEY `invoice_number` (`invoice_number`),
  KEY `idx_invoice_number` (`invoice_number`),
  KEY `idx_cashier_id` (`cashier_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_invoice_type` (`invoice_type`),
  KEY `idx_b2b_customer_id` (`b2b_customer_id`),
  KEY `idx_invoice_status` (`status`),
  CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`cashier_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `invoices_ibfk_2` FOREIGN KEY (`b2b_customer_id`) REFERENCES `b2b_customers` (`customer_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `monthly_sales_summary`
--

DROP TABLE IF EXISTS `monthly_sales_summary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `monthly_sales_summary` (
  `summary_id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(200) NOT NULL,
  `year` int NOT NULL,
  `month` int NOT NULL,
  `total_invoices` int DEFAULT '0',
  `total_sales` decimal(10,2) DEFAULT '0.00',
  `total_tax` decimal(10,2) DEFAULT '0.00',
  `total_discount` decimal(10,2) DEFAULT '0.00',
  `total_items_sold` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`summary_id`),
  UNIQUE KEY `unique_company_year_month` (`company_name`,`year`,`month`),
  UNIQUE KEY `UK8ru38h1x9sxyte2v2tj22yd76` (`company_name`,`year`,`month`),
  KEY `idx_company_name` (`company_name`),
  KEY `idx_year_month` (`year`,`month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `product_id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(200) NOT NULL,
  `product_name` varchar(200) NOT NULL,
  `category_id` int DEFAULT NULL,
  `product_code` varchar(50) NOT NULL,
  `barcode` varchar(100) NOT NULL,
  `packaging_type` varchar(50) DEFAULT NULL,
  `packaging_size` decimal(10,3) DEFAULT NULL,
  `packaging_unit` varchar(20) DEFAULT 'kg',
  `selling_price_per_unit` decimal(10,2) NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT '0.00',
  `min_stock_level` decimal(10,2) DEFAULT '0.00',
  `gst_percentage` decimal(5,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `unit` varchar(20) DEFAULT NULL,
  `hsn_code` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`product_id`),
  UNIQUE KEY `unique_company_product_code` (`company_name`,`product_code`),
  UNIQUE KEY `unique_company_barcode` (`company_name`,`barcode`),
  KEY `idx_company_name` (`company_name`),
  KEY `idx_product_code` (`product_code`),
  KEY `idx_barcode` (`barcode`),
  KEY `idx_packaging_type` (`packaging_type`),
  KEY `idx_product_name` (`product_name`),
  KEY `idx_category_id` (`category_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(200) NOT NULL,
  `role` enum('ADMIN','CASHIER') NOT NULL,
  `password` varchar(255) NOT NULL,
  `gst_number` varchar(50) DEFAULT NULL,
  `fssai_license` varchar(50) DEFAULT NULL,
  `address` text,
  `phone_number` varchar(20) DEFAULT NULL,
  `bank_name` varchar(200) DEFAULT NULL,
  `account_number` varchar(50) DEFAULT NULL,
  `ifsc_code` varchar(20) DEFAULT NULL,
  `branch_name` varchar(200) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `b2b_invoice_start` int DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `unique_company_role` (`company_name`,`role`),
  UNIQUE KEY `UKdlgghl8ld1w7aele3bp5427r7` (`company_name`,`role`),
  KEY `idx_company_name` (`company_name`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `vw_daily_sales`
--

DROP TABLE IF EXISTS `vw_daily_sales`;
/*!50001 DROP VIEW IF EXISTS `vw_daily_sales`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_daily_sales` AS SELECT 
 1 AS `sale_date`,
 1 AS `total_invoices`,
 1 AS `total_sales`,
 1 AS `total_tax`,
 1 AS `total_discount`,
 1 AS `net_sales`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_product_sales`
--

DROP TABLE IF EXISTS `vw_product_sales`;
/*!50001 DROP VIEW IF EXISTS `vw_product_sales`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_product_sales` AS SELECT 
 1 AS `product_id`,
 1 AS `product_code`,
 1 AS `product_name`,
 1 AS `packaging_type`,
 1 AS `packaging_size`,
 1 AS `total_quantity_sold`,
 1 AS `total_revenue`,
 1 AS `avg_selling_price`,
 1 AS `times_sold`*/;
SET character_set_client = @saved_cs_client;

--
-- Dumping events for database 'spices_billing_system'
--

--
-- Dumping routines for database 'spices_billing_system'
--
/*!50003 DROP PROCEDURE IF EXISTS `sp_generate_invoice_number` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_generate_invoice_number`(OUT invoice_number VARCHAR(50))
BEGIN
    DECLARE prefix VARCHAR(10) DEFAULT 'INV';
    DECLARE date_part VARCHAR(10);
    DECLARE seq_num INT;
    
    SET date_part = DATE_FORMAT(NOW(), '%Y-%m%d');
    
    -- Get next sequence number for today
    SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(invoice_number, '-', -1) AS UNSIGNED)), 0) + 1
    INTO seq_num
    FROM invoices
    WHERE DATE(created_at) = CURDATE();
    
    SET invoice_number = CONCAT(prefix, '-', date_part, '-', LPAD(seq_num, 4, '0'));
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_update_stock_after_sale` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_update_stock_after_sale`(
    IN p_product_id INT,
    IN p_quantity DECIMAL(10, 2)
)
BEGIN
    -- Update stock quantity in products table
    UPDATE products 
    SET quantity = quantity - p_quantity
    WHERE product_id = p_product_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Final view structure for view `vw_daily_sales`
--

/*!50001 DROP VIEW IF EXISTS `vw_daily_sales`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_daily_sales` AS select cast(`invoices`.`created_at` as date) AS `sale_date`,count(0) AS `total_invoices`,sum(`invoices`.`total_amount`) AS `total_sales`,sum(`invoices`.`tax_amount`) AS `total_tax`,sum(`invoices`.`discount_amount`) AS `total_discount`,sum(((`invoices`.`total_amount` - `invoices`.`tax_amount`) - `invoices`.`discount_amount`)) AS `net_sales` from `invoices` where (`invoices`.`status` = 'ACTIVE') group by cast(`invoices`.`created_at` as date) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_product_sales`
--

/*!50001 DROP VIEW IF EXISTS `vw_product_sales`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_product_sales` AS select `p`.`product_id` AS `product_id`,`p`.`product_code` AS `product_code`,`p`.`product_name` AS `product_name`,`p`.`packaging_type` AS `packaging_type`,`p`.`packaging_size` AS `packaging_size`,sum(`ii`.`quantity`) AS `total_quantity_sold`,sum(`ii`.`total_price`) AS `total_revenue`,avg(`ii`.`unit_price`) AS `avg_selling_price`,count(distinct `ii`.`invoice_id`) AS `times_sold` from ((`products` `p` join `invoice_items` `ii` on((`p`.`product_id` = `ii`.`product_id`))) join `invoices` `i` on((`ii`.`invoice_id` = `i`.`invoice_id`))) where (`i`.`status` = 'ACTIVE') group by `p`.`product_id`,`p`.`product_code`,`p`.`product_name`,`p`.`packaging_type`,`p`.`packaging_size` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-15 15:34:15
