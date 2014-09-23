DROP TABLE IF EXISTS `cdr`;
CREATE TABLE `cdr` (
   `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
   `calldate` DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
   `clid` VARCHAR(80) NOT NULL DEFAULT '',
   `src` VARCHAR(80) NOT NULL DEFAULT '',
   `dst` VARCHAR(80) NOT NULL DEFAULT '',
   `dcontext` VARCHAR(80) NOT NULL DEFAULT '',
   `channel` VARCHAR(80) NOT NULL DEFAULT '',
   `dstchannel` VARCHAR(50) NOT NULL DEFAULT '',
   `lastapp` VARCHAR(80) NOT NULL DEFAULT '',
   `lastdata` VARCHAR(200) NOT NULL DEFAULT '',
   `duration` INTEGER(11) NOT NULL DEFAULT '0',
   `billsec` INTEGER(11) NOT NULL DEFAULT '0',
   `disposition` VARCHAR(45) NOT NULL DEFAULT '',
   `amaflags` VARCHAR(50) NULL DEFAULT NULL,
   `accountcode` VARCHAR(20) NULL DEFAULT NULL,
   `uniqueid` VARCHAR(32) NOT NULL DEFAULT '',
   `userfield` FLOAT UNSIGNED NULL DEFAULT NULL,
   `peeraccount` VARCHAR(20) NOT NULL DEFAULT '',
   `linkedid` VARCHAR(32) NOT NULL DEFAULT '',
   `sequence` INT(11) NOT NULL DEFAULT '0',
   `record` VARCHAR(50) NOT NULL DEFAULT '',
   PRIMARY KEY (`id`),
   INDEX `calldate` (`calldate`),
   INDEX `dst` (`dst`),
   INDEX `src` (`src`),
   INDEX `dcontext` (`dcontext`),
   INDEX `clid` (`clid`)
)
ENGINE=InnoDB;

DROP TABLE IF EXISTS `calls`;
CREATE TABLE `calls` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `calldate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `src` varchar(80) NOT NULL DEFAULT '',
  `dst` varchar(80) NOT NULL DEFAULT '',
  `uniqueid` varchar(32) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `calldate` (`calldate`),
  KEY `dst` (`dst`),
  KEY `src` (`src`)
)
ENGINE=InnoDB;
