-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: glownext
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `auth_group`
--

DROP TABLE IF EXISTS `auth_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_group` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `auth_group_permissions`
--

DROP TABLE IF EXISTS `auth_group_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_group_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_group_permissions_group_id_permission_id_0cd325b0_uniq` (`group_id`,`permission_id`),
  KEY `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` (`permission_id`),
  CONSTRAINT `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `auth_group_permissions_group_id_b120cbf9_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `auth_permission`
--

DROP TABLE IF EXISTS `auth_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_permission` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content_type_id` int NOT NULL,
  `codename` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_permission_content_type_id_codename_01ab375a_uniq` (`content_type_id`,`codename`),
  CONSTRAINT `auth_permission_content_type_id_2f476e4b_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `django_admin_log`
--

DROP TABLE IF EXISTS `django_admin_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_admin_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `action_time` datetime(6) NOT NULL,
  `object_id` longtext COLLATE utf8mb4_unicode_ci,
  `object_repr` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_flag` smallint unsigned NOT NULL,
  `change_message` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `content_type_id` int DEFAULT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `django_admin_log_content_type_id_c4bce8eb_fk_django_co` (`content_type_id`),
  KEY `django_admin_log_user_id_c564eba6_fk_userauth_user_id` (`user_id`),
  CONSTRAINT `django_admin_log_content_type_id_c4bce8eb_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`),
  CONSTRAINT `django_admin_log_user_id_c564eba6_fk_userauth_user_id` FOREIGN KEY (`user_id`) REFERENCES `userauth_user` (`id`),
  CONSTRAINT `django_admin_log_chk_1` CHECK ((`action_flag` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `django_content_type`
--

DROP TABLE IF EXISTS `django_content_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_content_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `app_label` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `model` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `django_content_type_app_label_model_76bd3d3b_uniq` (`app_label`,`model`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `django_migrations`
--

DROP TABLE IF EXISTS `django_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_migrations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `app` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `applied` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `django_session`
--

DROP TABLE IF EXISTS `django_session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_session` (
  `session_key` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `session_data` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expire_date` datetime(6) NOT NULL,
  PRIMARY KEY (`session_key`),
  KEY `django_session_expire_date_a5c62663` (`expire_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `store_booking`
--

DROP TABLE IF EXISTS `store_booking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `store_booking` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `bid` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `service_type` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` longtext COLLATE utf8mb4_unicode_ci,
  `scheduled_date` date NOT NULL,
  `scheduled_time` time(6) NOT NULL,
  `note` longtext COLLATE utf8mb4_unicode_ci,
  `booking_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `decline_reason` longtext COLLATE utf8mb4_unicode_ci,
  `payment_method` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total` decimal(8,2) NOT NULL,
  `khalti_pidx` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `khalti_txn_id` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date` datetime(6) NOT NULL,
  `updated` datetime(6) NOT NULL,
  `customer_id` bigint DEFAULT NULL,
  `service_id` bigint DEFAULT NULL,
  `commission_rate` decimal(5,2) NOT NULL,
  `commission_amount` decimal(8,2) NOT NULL,
  `vendor_amount` decimal(8,2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bid` (`bid`),
  KEY `store_booking_customer_id_e95ed499_fk_userauth_user_id` (`customer_id`),
  KEY `store_booking_service_id_2db1e59f_fk_store_service_id` (`service_id`),
  CONSTRAINT `store_booking_customer_id_e95ed499_fk_userauth_user_id` FOREIGN KEY (`customer_id`) REFERENCES `userauth_user` (`id`),
  CONSTRAINT `store_booking_service_id_2db1e59f_fk_store_service_id` FOREIGN KEY (`service_id`) REFERENCES `store_service` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `store_service`
--

DROP TABLE IF EXISTS `store_service`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `store_service` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `sid` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` longtext COLLATE utf8mb4_unicode_ci,
  `slug` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(8,2) NOT NULL,
  `service_type` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `thumbnail` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` datetime(6) NOT NULL,
  `updated` datetime(6) NOT NULL,
  `category` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `vendor_id` bigint NOT NULL,
  `duration_minutes` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sid` (`sid`),
  UNIQUE KEY `slug` (`slug`),
  KEY `store_service_vendor_id_43b32b3d_fk_vendor_vendor_id` (`vendor_id`),
  CONSTRAINT `store_service_vendor_id_43b32b3d_fk_vendor_vendor_id` FOREIGN KEY (`vendor_id`) REFERENCES `vendor_vendor` (`id`),
  CONSTRAINT `store_service_chk_1` CHECK ((`duration_minutes` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `store_servicereview`
--

DROP TABLE IF EXISTS `store_servicereview`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `store_servicereview` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `rid` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rating` int DEFAULT NULL,
  `review` longtext COLLATE utf8mb4_unicode_ci,
  `is_verified` tinyint(1) NOT NULL,
  `active` tinyint(1) NOT NULL,
  `date` datetime(6) NOT NULL,
  `booking_id` bigint DEFAULT NULL,
  `service_id` bigint NOT NULL,
  `user_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rid` (`rid`),
  UNIQUE KEY `booking_id` (`booking_id`),
  KEY `store_servicereview_service_id_88574209_fk_store_service_id` (`service_id`),
  KEY `store_servicereview_user_id_84092f81_fk_userauth_user_id` (`user_id`),
  CONSTRAINT `store_servicereview_booking_id_e5caea8a_fk_store_booking_id` FOREIGN KEY (`booking_id`) REFERENCES `store_booking` (`id`),
  CONSTRAINT `store_servicereview_service_id_88574209_fk_store_service_id` FOREIGN KEY (`service_id`) REFERENCES `store_service` (`id`),
  CONSTRAINT `store_servicereview_user_id_84092f81_fk_userauth_user_id` FOREIGN KEY (`user_id`) REFERENCES `userauth_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `userauth_profile`
--

DROP TABLE IF EXISTS `userauth_profile`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `userauth_profile` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mobile` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_id` bigint NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `userauth_profile_user_id_7b8dd0b9_fk_userauth_user_id` FOREIGN KEY (`user_id`) REFERENCES `userauth_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `userauth_user`
--

DROP TABLE IF EXISTS `userauth_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `userauth_user` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `password` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_login` datetime(6) DEFAULT NULL,
  `is_superuser` tinyint(1) NOT NULL,
  `first_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_staff` tinyint(1) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `date_joined` datetime(6) NOT NULL,
  `username` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(254) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `userauth_user_groups`
--

DROP TABLE IF EXISTS `userauth_user_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `userauth_user_groups` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `group_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `userauth_user_groups_user_id_group_id_46e5f227_uniq` (`user_id`,`group_id`),
  KEY `userauth_user_groups_group_id_248add28_fk_auth_group_id` (`group_id`),
  CONSTRAINT `userauth_user_groups_group_id_248add28_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`),
  CONSTRAINT `userauth_user_groups_user_id_4e653733_fk_userauth_user_id` FOREIGN KEY (`user_id`) REFERENCES `userauth_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `userauth_user_user_permissions`
--

DROP TABLE IF EXISTS `userauth_user_user_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `userauth_user_user_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `userauth_user_user_permi_user_id_permission_id_ce5f9d7d_uniq` (`user_id`,`permission_id`),
  KEY `userauth_user_user_p_permission_id_f1415beb_fk_auth_perm` (`permission_id`),
  CONSTRAINT `userauth_user_user_p_permission_id_f1415beb_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `userauth_user_user_p_user_id_e644b2fd_fk_userauth_` FOREIGN KEY (`user_id`) REFERENCES `userauth_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vendor_dispute`
--

DROP TABLE IF EXISTS `vendor_dispute`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_dispute` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `reason` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` varchar(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` datetime(6) NOT NULL,
  `booking_id` bigint DEFAULT NULL,
  `customer_id` bigint DEFAULT NULL,
  `vendor_id` bigint NOT NULL,
  `admin_response` longtext COLLATE utf8mb4_unicode_ci,
  `attachment` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `did` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resolution` longtext COLLATE utf8mb4_unicode_ci,
  `resolved_at` datetime(6) DEFAULT NULL,
  `resolved_by_id` bigint DEFAULT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated` datetime(6) NOT NULL,
  `vendor_responded_at` datetime(6) DEFAULT NULL,
  `vendor_response` longtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `did` (`did`),
  KEY `vendor_dispute_booking_id_d451bc4f_fk_store_booking_id` (`booking_id`),
  KEY `vendor_dispute_customer_id_0c8a96c1_fk_userauth_user_id` (`customer_id`),
  KEY `vendor_dispute_vendor_id_6721b72d_fk_vendor_vendor_id` (`vendor_id`),
  KEY `vendor_dispute_resolved_by_id_dcd989e4_fk_userauth_user_id` (`resolved_by_id`),
  CONSTRAINT `vendor_dispute_booking_id_d451bc4f_fk_store_booking_id` FOREIGN KEY (`booking_id`) REFERENCES `store_booking` (`id`),
  CONSTRAINT `vendor_dispute_customer_id_0c8a96c1_fk_userauth_user_id` FOREIGN KEY (`customer_id`) REFERENCES `userauth_user` (`id`),
  CONSTRAINT `vendor_dispute_resolved_by_id_dcd989e4_fk_userauth_user_id` FOREIGN KEY (`resolved_by_id`) REFERENCES `userauth_user` (`id`),
  CONSTRAINT `vendor_dispute_vendor_id_6721b72d_fk_vendor_vendor_id` FOREIGN KEY (`vendor_id`) REFERENCES `vendor_vendor` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vendor_payout`
--

DROP TABLE IF EXISTS `vendor_payout`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_payout` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `date` datetime(6) NOT NULL,
  `item_id` bigint DEFAULT NULL,
  `vendor_id` bigint DEFAULT NULL,
  `commission_amount` decimal(10,2) NOT NULL,
  `gross_amount` decimal(10,2) NOT NULL,
  `net_amount` decimal(10,2) NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `admin_note` longtext COLLATE utf8mb4_unicode_ci,
  `amount` decimal(10,2) NOT NULL,
  `payment_reference` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pid` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `processed_at` datetime(6) DEFAULT NULL,
  `processed_by_id` bigint DEFAULT NULL,
  `requested_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pid` (`pid`),
  KEY `vendor_payout_item_id_43a28a21_fk_store_booking_id` (`item_id`),
  KEY `vendor_payout_vendor_id_9b447cb5_fk_vendor_vendor_id` (`vendor_id`),
  KEY `vendor_payout_processed_by_id_1eefc9ed_fk_userauth_user_id` (`processed_by_id`),
  CONSTRAINT `vendor_payout_item_id_43a28a21_fk_store_booking_id` FOREIGN KEY (`item_id`) REFERENCES `store_booking` (`id`),
  CONSTRAINT `vendor_payout_processed_by_id_1eefc9ed_fk_userauth_user_id` FOREIGN KEY (`processed_by_id`) REFERENCES `userauth_user` (`id`),
  CONSTRAINT `vendor_payout_vendor_id_9b447cb5_fk_vendor_vendor_id` FOREIGN KEY (`vendor_id`) REFERENCES `vendor_vendor` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vendor_vendor`
--

DROP TABLE IF EXISTS `vendor_vendor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_vendor` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `image` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `store_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `vendor_id` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date` date NOT NULL,
  `slug` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_id` bigint DEFAULT NULL,
  `is_verified` tinyint(1) NOT NULL,
  `verification_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `verified_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vendor_id` (`vendor_id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `vendor_vendor_slug_e7b8f5a5` (`slug`),
  CONSTRAINT `vendor_vendor_user_id_424f99f3_fk_userauth_user_id` FOREIGN KEY (`user_id`) REFERENCES `userauth_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-23 23:25:04
