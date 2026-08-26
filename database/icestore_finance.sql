-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: icestore_finance
-- ------------------------------------------------------
-- Server version	8.0.46

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
-- Table structure for table `budgets`
--

DROP TABLE IF EXISTS `budgets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `budgets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL DEFAULT '1',
  `category_id` int NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `month` int NOT NULL,
  `year` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_category_month` (`user_id`,`category_id`,`month`,`year`),
  UNIQUE KEY `unique_user_budget` (`user_id`,`category_id`,`month`,`year`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `budgets_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budgets`
--

LOCK TABLES `budgets` WRITE;
/*!40000 ALTER TABLE `budgets` DISABLE KEYS */;
INSERT INTO `budgets` VALUES (5,2,10,6000.00,8,2026,'2026-08-25 03:40:09');
/*!40000 ALTER TABLE `budgets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `type` enum('INCOME','EXPENSE') NOT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `color` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,1,'Lương tháng','INCOME','fa-money-bill','#4CAF50','2026-08-18 02:44:52','2026-08-18 02:44:52'),(2,1,'Tiền thực phẩm','EXPENSE',NULL,NULL,'2026-08-18 02:44:52','2026-08-25 01:27:24'),(3,1,'Tiền nhà','EXPENSE','fa-home','#795548','2026-08-18 02:44:52','2026-08-18 02:44:52'),(4,1,'Cà phê','EXPENSE','fa-mug-hot','#6D4C41','2026-08-18 02:44:52','2026-08-18 02:44:52'),(5,1,'Tiền ăn sáng','EXPENSE',NULL,NULL,'2026-08-25 01:27:08','2026-08-25 01:27:08'),(6,1,'Tiền xăng','EXPENSE',NULL,NULL,'2026-08-25 01:27:35','2026-08-25 01:27:35'),(7,1,'Tiền gửi về','EXPENSE',NULL,NULL,'2026-08-25 01:27:54','2026-08-25 01:27:54'),(8,1,'Tiền rút ngân hàng','EXPENSE',NULL,NULL,'2026-08-25 01:29:30','2026-08-25 01:29:30'),(9,1,'Tiền rút ngân hàng','INCOME',NULL,NULL,'2026-08-25 01:29:42','2026-08-25 01:29:42'),(10,2,'Tiền nhà','EXPENSE',NULL,NULL,'2026-08-25 03:37:07','2026-08-25 05:11:58'),(11,2,'Tiền thức ăn','EXPENSE',NULL,NULL,'2026-08-25 05:12:07','2026-08-25 05:12:07'),(12,2,'Tiền ăn','EXPENSE',NULL,NULL,'2026-08-25 05:12:13','2026-08-25 05:12:13'),(13,2,'Tiền lương','INCOME',NULL,NULL,'2026-08-25 05:12:25','2026-08-25 05:12:25');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `debts`
--

DROP TABLE IF EXISTS `debts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `debts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL DEFAULT '1',
  `name` varchar(255) NOT NULL,
  `type` enum('BORROW','LEND') NOT NULL,
  `total_amount` decimal(15,2) NOT NULL,
  `paid_amount` decimal(15,2) DEFAULT '0.00',
  `due_date` date DEFAULT NULL,
  `status` enum('ONGOING','COMPLETED') DEFAULT 'ONGOING',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `debts`
--

LOCK TABLES `debts` WRITE;
/*!40000 ALTER TABLE `debts` DISABLE KEYS */;
INSERT INTO `debts` VALUES (1,1,'Cho A mượn','LEND',10000.00,0.00,'2026-08-20','ONGOING','2026-08-21 01:55:50');
/*!40000 ALTER TABLE `debts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `savings`
--

DROP TABLE IF EXISTS `savings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `savings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL DEFAULT '1',
  `name` varchar(255) NOT NULL,
  `target_amount` decimal(15,2) NOT NULL,
  `saved_amount` decimal(15,2) DEFAULT '0.00',
  `target_date` date DEFAULT NULL,
  `status` enum('ONGOING','COMPLETED') DEFAULT 'ONGOING',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `savings`
--

LOCK TABLES `savings` WRITE;
/*!40000 ALTER TABLE `savings` DISABLE KEYS */;
INSERT INTO `savings` VALUES (1,1,'Gửi tiền về',60000.00,0.00,'2026-12-31','ONGOING','2026-08-21 01:50:47');
/*!40000 ALTER TABLE `savings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `wallet_id` int NOT NULL,
  `to_wallet_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `type` enum('INCOME','EXPENSE','TRANSFER') NOT NULL,
  `note` text,
  `transaction_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `wallet_id` (`wallet_id`),
  KEY `to_wallet_id` (`to_wallet_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `transactions_ibfk_2` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `transactions_ibfk_3` FOREIGN KEY (`to_wallet_id`) REFERENCES `wallets` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `transactions_ibfk_4` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
INSERT INTO `transactions` VALUES (14,1,3,NULL,1,11183.00,'INCOME',NULL,'2026-08-10','2026-08-21 06:49:40','2026-08-21 06:49:40'),(16,1,3,NULL,3,4333.00,'EXPENSE',NULL,'2026-08-10','2026-08-25 01:41:49','2026-08-25 01:41:49'),(17,1,1,NULL,7,10000.00,'EXPENSE',NULL,'2026-08-22','2026-08-25 01:42:30','2026-08-25 01:42:30'),(19,2,7,NULL,11,546.00,'EXPENSE',NULL,'2026-08-23','2026-08-25 07:13:02','2026-08-25 07:13:02');
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','$2b$10$PtZosxjrSGULHj/J9enYQuk7jX0jO40RaqUmNheFkT1c9X2ILSf8S','2026-08-21 02:14:29'),(2,'Nhan','$2b$10$ZHyUXFiOCdOllxsSyvviyu1QhHs7f4vCf1IBEt2hPu7AIIuQh5q3a','2026-08-25 03:28:32');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wallets`
--

DROP TABLE IF EXISTS `wallets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wallets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `balance` decimal(15,2) DEFAULT '0.00',
  `currency` varchar(10) DEFAULT 'VND',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `wallets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wallets`
--

LOCK TABLES `wallets` WRITE;
/*!40000 ALTER TABLE `wallets` DISABLE KEYS */;
INSERT INTO `wallets` VALUES (1,1,'Tiền mặt',600.00,'TWD','2026-08-18 02:44:52','2026-08-25 01:42:30'),(2,1,'元大銀行',5672.00,'TWD','2026-08-18 02:44:52','2026-08-25 00:52:03'),(3,1,'華南銀行',12183.00,'TWD','2026-08-18 02:44:52','2026-08-25 01:41:49'),(4,1,'Techcombank',903000.00,'VND','2026-08-21 02:04:20','2026-08-25 03:12:48'),(5,2,'華南銀行',12183.00,'TWD','2026-08-25 05:10:52','2026-08-25 05:10:52'),(6,2,'元大銀行',5672.00,'TWD','2026-08-25 05:11:41','2026-08-25 05:11:41'),(7,2,'Tiền mặt',154.00,'TWD','2026-08-25 05:12:56','2026-08-25 07:57:57');
/*!40000 ALTER TABLE `wallets` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-26  9:24:54
