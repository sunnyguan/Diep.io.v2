var express = require('express');
var app = express();
var serv = require('http').Server(app);
//var lzwCompress = require('lzwcompress');

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

serv.listen(process.env.PORT || 2000, '0.0.0.0');
console.log("Server started!");

var SOCKET_LIST = {};

var WIDTH = 0;
var HEIGHT = 0;

var GAME_DIMENSION = 10000;

var Entity = function() {
	var self = {
		x : 0,
		y : 0,
		spdX : 0,
		spdY : 0,
		id : "",
	}
	self.update = function() {
		self.updatePosition();
	}
	self.updatePosition = function() {

		if (self.x + self.spdX < GAME_DIMENSION && self.x + self.spdX > 0 && self.spdX != 0) {
			self.x += self.spdX;
			if(!self.updateX) self.updateX = true;
		}
		if (self.y + self.spdY < GAME_DIMENSION && self.y + self.spdY > 0 && self.spdY != 0) {
			self.y += self.spdY;
			if(!self.updateY) self.updateY = true;
		}

		self.x = Math.floor(self.x * 100000) / 100000;
		self.y = Math.floor(self.y * 100000) / 100000;
	}
	self.getDistance = function(pt) {
		return Math.sqrt(Math.pow(self.x - pt.x, 2)
				+ Math.pow(self.y - pt.y, 2));
	};
	return self;
}
function getDistance (pt1, pt2) {
	return Math.sqrt(Math.pow(pt1.x - pt2.x, 2)
			+ Math.pow(pt1.y - pt2.y, 2));
};
var messages = "";

var playerFirst = true;
var Player = function(id, name, isAI) {
	var self = Entity();

	self.tankType = 0;
	self.updateTankType = true;
	self.reloadNum = 0;

	self.id = id;
	self.name = name;
	self.x = Math.random() * GAME_DIMENSION;
	self.y = Math.random() * GAME_DIMENSION;
	self.updateX = true;
	self.updateY = true;
	self.number = "" + Math.floor(10 * Math.random());
	self.pressingRight = false;
	self.pressingLeft = false;
	self.pressingUp = false;
	self.pressingDown = false;
	self.pressingAttack = false;
	self.mouseAngle = 0;
	self.updateMouseAngle = true;
	self.upgrades = 0;
	self.updateUpgrades = true;

	self.hp = 100;
	self.updateHp = true;

	self.score = 0;
	self.updateScore = true;

	self.timer = 0;
	self.type = "Player";

	self.regen = 21;
	self.hpMax = 100;
	self.updateHpMax = true;
	self.bulletHp = 7;
	self.bulletSpeed = 10;
	self.reload = 25;
	self.maxSpd = 6;
	self.bodyDamage = 10;
	self.penetration = 0;

	self.minRegen = 8;
	self.maxRegen = 21;
	self.updateRegen = true;

	self.minHp = 100;
	self.maxHp = 200;

	self.minBulletHp = 7;
	self.maxBulletHp = 30;
	self.updateBulletHp = true;

	self.minBulletSpeed = 10;
	self.maxBulletSpeed = 25;
	self.updateBulletSpeed = true;

	self.minReload = 11;
	self.maxReload = 38;
	self.updateReload = true;

	self.minSpeed = 6;
	self.maxSpeed = 10;
	self.updateSpeed = true;

	self.minBodyDamage = 10;
	self.maxBodyDamage = 200;
	self.updateBodyDamage = true;

	self.minPenetration = 0;
	self.maxPenetration = 50;
	self.updateBodyDamage = true;

	self.regenCount = 0;
	self.hpMaxCount = 0;
	self.bulletHpCount = 0;
	self.bulletSpeedCount = 0;
	self.reloadCount = 0;
	self.maxSpdCount = 0;
	self.bodyDamageCount = 0;
	self.penetrationCount = 0;

	self.bullets = [];
	self.moveTimer = 0;
	self.friction = 0.94;
	self.level = 1;
	self.updateLevel = true;
	self.mouseX = 0;
	self.mouseY = 0;

	if(isAI !== undefined) self.isAI = true;
	else self.isAI = false;

	self.needToUpdate = true;
	self.newScore = true;

	var xSector = Math.floor(self.x / GAME_DIMENSION * 10);
	var ySector = Math.floor(self.y / GAME_DIMENSION * 10);
	self.xSector = xSector;
	self.ySector = ySector;
	Player.matrix[xSector][ySector].push(self);

	self.availableUpgrades = [ 0, 0, 0 ];
	self.sent = [ 0, 0, 0 ];
	var super_update = self.update;
	self.evaluateNextLevelScore = function(x) {
		x++;
		if (x == 2)
			return 10;
		else if (x == 3)
			return 25;
		else if (x == 4)
			return 65;
		else if (x > 45)
			return 10000000;
		else
			return 0.46 * x * x * x - 12 * x * x + 170 * x - 529;
	}
	self.update = function() {
		var ox = self.x;
		var oy = self.y;
		self.updateSpd();

		var xSector = Math.floor(self.x / GAME_DIMENSION * 10);
		var ySector = Math.floor(self.y / GAME_DIMENSION * 10);
		if(self.xSector != xSector || self.ySector != ySector){
			var index = Player.matrix[self.xSector][self.ySector].indexOf(self);
			Player.matrix[self.xSector][self.ySector].splice(index, 1);
			self.xSector = xSector;
			self.ySector = ySector;
			Player.matrix[self.xSector][self.ySector].push(self);
		}

		if (self.score >= self.evaluateNextLevelScore(self.level)) {
			var maxUps = 0;
			for (var i = 0; i < 45; i++) {
				if (self.score >= self.evaluateNextLevelScore(self.level + i)) {
					maxUps++;
				} else
					break;
			}
			self.upgrades += maxUps;
			self.level += maxUps;

			self.updateUpgrades = true;
			self.updateLevel = true;
		}
		self.checkForUpgrades();
		if (self.timer % Math.round(self.regen) == 0) {
			if (self.hp < self.hpMax) {
				self.hp++;
				self.updateHp = true;
			}else if (self.hp > self.hpMax){
				self.hp = self.hpMax;
				self.updateHp = true;
			}
		}

		/*if (self.timer % 40 == 0 && self.x > GAME_DIMENSION * 3 / 9
				&& self.x < GAME_DIMENSION * 6 / 9
				&& self.y > GAME_DIMENSION * 3 / 9
				&& self.y < GAME_DIMENSION * 6 / 9) {
			var b = Bullet(self.id, 0, 10, 4, false, true);
			var x = Math.floor(Math.random()
					* (GAME_DIMENSION * 6 / 9 - GAME_DIMENSION * 3 / 9 + 1)
					+ GAME_DIMENSION * 1 / 3);
			var y = Math.floor(Math.random()
					* (GAME_DIMENSION * 6 / 9 - GAME_DIMENSION * 3 / 9 + 1)
					+ GAME_DIMENSION * 1 / 3);
			b.x = x;
			b.y = y;
		}*/

		super_update();
		self.timer++;
		if (self.tankType == 7 || self.tankType == 15) {
			if (self.bullets.length != 0) {
				for ( var i in self.bullets) {
					var bullet = self.bullets[i];
					if (typeof bullet == undefined)
						continue;
					if (bullet.toRemove)
						self.bullets.splice(i, 1);
					if (self.pressingAttack) {

						var bulletX = bullet.x - self.x + WIDTH / 2;
						var bulletY = bullet.y - self.y + HEIGHT / 2;
						bullet.angle = Math.atan2((self.mouseY + HEIGHT / 2)
								- bulletY, (self.mouseX + WIDTH / 2) - bulletX)
								* 180 / Math.PI;
						var distance = Math.sqrt(Math.pow(
								self.mouseX - bulletX, 2)
								+ Math.pow(self.mouseY - bulletY, 2));
						if (Math.sqrt(Math.pow(self.mouseX + WIDTH / 2
								- bulletX, 2)
								+ Math.pow(self.mouseY + HEIGHT / 2 - bulletY,
										2)) < 30) {
							bullet.stationary = true;
							bullet.friction = 0.80;
						} else {
							bullet.stationary = false;
							bullet.friction = 1;
						}
					} else {
						var gx = 0;
						var gy = 0;
						var min = 100000;
						for ( var i in Square.list) {
							var square = Square.list[i];
							var dist = bullet.getDistance(square);
							if (dist < min) {
								min = dist;
								gx = square.x;
								gy = square.y;
							}
						}
						for ( var i in Triangle.list) {
							var square = Triangle.list[i];
							var dist = bullet.getDistance(square);
							if (dist < min) {
								min = dist;
								gx = square.x;
								gy = square.y;
							}
						}
						for ( var i in Pentagon.list) {
							var square = Pentagon.list[i];
							var dist = bullet.getDistance(square);
							if (dist < min) {
								min = dist;
								gx = square.x;
								gy = square.y;
							}
						}
						for ( var i in Bullet.list) {
							var square = Bullet.list[i];
							if (square.parent != self.id || square.chaser) {
								var dist = bullet.getDistance(square);
								if (dist < min) {
									min = dist;
									gx = square.x;
									gy = square.y;
								}
							}
						}

						var angle = Math.atan2(gy - bullet.y, gx - bullet.x);
						bullet.angle = angle * 180 / Math.PI;
					}
				}
			}
		}
		if ((self.pressingAttack || (self.tankType == 7 || self.tankType == 15))
				&& self.timer % Math.round(self.reload) == 0) {
			self.shootBullet(self.mouseAngle, self.mouseX, self.mouseY);
		}
	}
	self.checkForUpgrades = function() {
		var tanks = [];
		if ((self.level >= 15 && !self.sent[0])
				|| (self.level >= 30 && !self.sent[1])
				|| (self.level >= 45 && !self.sent[2])) {
			if (self.level >= 45 && !self.availableUpgrades[2])
				self.availableUpgrades[2] = true;
			else if (self.level >= 30 && !self.availableUpgrades[1])
				self.availableUpgrades[1] = true;
			else if (self.level >= 15 && !self.availableUpgrades[0])
				self.availableUpgrades[0] = true;

			if (self.level >= 45 && self.availableUpgrades[2]) {
				if (self.tankType == 8) {
					tanks = [ 3, 4, 9, 25 ];
				} else if (self.tankType == 13) {
					tanks = [ 3, 4, 9, 25 ];
				} else if (self.tankType == 14) {
					tanks = [ 2, 21 ];
				} else if (self.tankType == 5) {
					tanks = [ 6 ];
				} else if (self.tankType == 7) {
					tanks = [ 3 ];
				} else if (self.tankType == 16) {
					tanks = [ 19, 20 ];
				} else if (self.tankType == 17) {
					tanks = [ 18 ];
				}
				if(SOCKET_LIST[self.id] !== undefined){
					SOCKET_LIST[self.id].emit('newTanks', {
						tanks : tanks
					});
				}
				self.sent[2] = true;
			} else if (self.level >= 30 && self.availableUpgrades[1]) {
				if (self.tankType == 1) {
					tanks = [ 8, 13, 14 ];
				} else if (self.tankType == 10) {
					tanks = [ 5, 8, 13 ];
				} else if (self.tankType == 11) {
					tanks = [ 16, 17 ];
				} else if (self.tankType == 12) {
					tanks = [ 8, 13, 16, 17 ]; // removed 7, 22, 24
				}
				if(SOCKET_LIST[self.id] !== undefined){
					SOCKET_LIST[self.id].emit('newTanks', {
						tanks : tanks
					});
				}
				self.sent[1] = true;
			} else if (self.level >= 15 && self.availableUpgrades[0]) {
				tanks = [ 1, 10, 11, 12]; // removed 23
				if(SOCKET_LIST[self.id] !== undefined){
					SOCKET_LIST[self.id].emit('newTanks', {
						tanks : tanks
					});
				}

				self.sent[0] = true;
			}
		}

	}
	self.shootBullet = function(angle, x, y) {

		var turbAngle = angle + 6 * Math.random() - 6;
		angle += 6 * Math.random() - 6;
		var damping = 0.8;

		var ax = self.x;
		var ay = self.y;

		if (self.tankType === 0) {
			self.spdX -= Math.cos(angle / 180 * Math.PI) * 0.5 * damping;
			self.spdY -= Math.sin(angle / 180 * Math.PI) * 0.5 * damping;
			var b = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
		} else if (self.tankType === 1) {

			turbAngle = -90 + turbAngle;
			if (self.reloadNum == 0) {
				self.spdX -= Math.cos(angle / 180 * Math.PI) * 0.5 * damping;
				self.spdY -= Math.sin(angle / 180 * Math.PI) * 0.5 * damping;

				ax = self.x - Math.cos(turbAngle * Math.PI / 180) * 17;
				ay = self.y - Math.sin(turbAngle * Math.PI / 180) * 17;
				var b1 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
				self.reloadNum = 1;
			} else if (self.reloadNum == 1) {
				self.spdX -= Math.cos(angle / 180 * Math.PI) * 0.5 * damping;
				self.spdY -= Math.sin(angle / 180 * Math.PI) * 0.5 * damping;

				ax = self.x + Math.cos(turbAngle * Math.PI / 180) * 17;
				ay = self.y + Math.sin(turbAngle * Math.PI / 180) * 17;
				var b2 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
				self.reloadNum = 0;
			}
		} else if (self.tankType === 2) {
			turbAngle = -90 + turbAngle;
			if (self.reloadNum == 0) {
				self.spdX -= Math.cos(angle / 180 * Math.PI) * 1 * damping;
				self.spdY -= Math.sin(angle / 180 * Math.PI) * 1 * damping;

				ax = self.x - Math.cos(turbAngle * Math.PI / 180) * 15;
				ay = self.y - Math.sin(turbAngle * Math.PI / 180) * 15;
				var b1 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);

				ax = self.x + Math.cos(turbAngle * Math.PI / 180) * 20;
				ay = self.y + Math.sin(turbAngle * Math.PI / 180) * 20;
				var b2 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);

				self.reloadNum = 1;
			} else if (self.reloadNum == 1) {
				self.spdX -= Math.cos(angle / 180 * Math.PI) * 0.5 * damping;
				self.spdY -= Math.sin(angle / 180 * Math.PI) * 0.5 * damping;

				var b = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);

				self.reloadNum = 0;
			}
		} else if (self.tankType === 3) {
			if (self.reloadNum == 0) {
				var b1 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
				var b2 = Bullet(self.id, angle - 2 * 360 / 8, self.bulletHp,
						self.bulletSpeed, ax, ay);
				var b3 = Bullet(self.id, angle - 4 * 360 / 8, self.bulletHp,
						self.bulletSpeed, ax, ay);
				var b4 = Bullet(self.id, angle - 6 * 360 / 8, self.bulletHp,
						self.bulletSpeed, ax, ay);
				self.reloadNum = 1;
			} else if (self.reloadNum == 1) {
				var b1 = Bullet(self.id, angle - 1 * 360 / 8, self.bulletHp,
						self.bulletSpeed, ax, ay);
				var b2 = Bullet(self.id, angle - 3 * 360 / 8, self.bulletHp,
						self.bulletSpeed, ax, ay);
				var b3 = Bullet(self.id, angle - 5 * 360 / 8, self.bulletHp,
						self.bulletSpeed, ax, ay);
				var b4 = Bullet(self.id, angle - 7 * 360 / 8, self.bulletHp,
						self.bulletSpeed, ax, ay);
				self.reloadNum = 0;
			}
		} else if (self.tankType === 4) {
			turbAngle = -90 + turbAngle;
			self.spdX += Math.cos(angle / 180 * Math.PI) * 1 * damping;
			self.spdY += Math.sin(angle / 180 * Math.PI) * 1 * damping;
			for (var i = 0; i < 360; i += 120) {
				angle += 120;
				turbAngle += 120;
				if (self.reloadNum == 0) {
					ax = self.x - Math.cos(turbAngle * Math.PI / 180) * 17;
					ay = self.y - Math.sin(turbAngle * Math.PI / 180) * 17;
					var b1 = Bullet(self.id, angle, self.bulletHp,
							self.bulletSpeed, ax, ay);
				} else if (self.reloadNum == 1) {
					ax = self.x + Math.cos(turbAngle * Math.PI / 180) * 17;
					ay = self.y + Math.sin(turbAngle * Math.PI / 180) * 17;
					var b2 = Bullet(self.id, angle, self.bulletHp,
							self.bulletSpeed, ax, ay);
				}
			}
			if (self.reloadNum == 0) {
				self.reloadNum = 1;
			} else
				self.reloadNum = 0;
		} else if (self.tankType === 5) {
			turbAngle = -90 + turbAngle;
			self.spdX += Math.cos(angle / 180 * Math.PI) * 1.5 * damping;
			self.spdY += Math.sin(angle / 180 * Math.PI) * 1.5 * damping;
			var b1 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
			angle += 150;
			var b2 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
			angle -= 150 * 2;
			var b2 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
		} else if (self.tankType === 6) {
			turbAngle = -90 + turbAngle;
			self.spdX += Math.cos(angle / 180 * Math.PI) * 2.5 * damping;
			self.spdY += Math.sin(angle / 180 * Math.PI) * 2.5 * damping;
			var b1 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);

			if (self.reloadNum == 0) {
				angle += 150;
				var b2 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
				angle -= 300;
				var b3 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
				self.reloadNum = 1;
			} else if (self.reloadNum == 1) {
				angle += 135;
				var b2 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
				angle -= 270;
				var b4 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
				self.reloadNum = 0;
			}
		} else if (self.tankType === 7) {
			if (self.bullets.length < 13) {
				var b = Bullet(self.id, angle, self.bulletHp,
						self.bulletSpeed / 2, ax, ay, true);
				self.bullets.push(b);
			}
		} else if (self.tankType === 8) {
			turbAngle = -90 + turbAngle;
			for (var i = 0; i < 360; i += 180) {
				angle += 180;
				turbAngle += 180;
				if (self.reloadNum == 0) {
					ax = self.x - Math.cos(turbAngle * Math.PI / 180) * 17;
					ay = self.y - Math.sin(turbAngle * Math.PI / 180) * 17;
					var b1 = Bullet(self.id, angle, self.bulletHp,
							self.bulletSpeed, ax, ay);
				} else if (self.reloadNum == 1) {
					ax = self.x + Math.cos(turbAngle * Math.PI / 180) * 17;
					ay = self.y + Math.sin(turbAngle * Math.PI / 180) * 17;
					var b2 = Bullet(self.id, angle, self.bulletHp,
							self.bulletSpeed, ax, ay);
				}
			}
			if (self.reloadNum == 0) {
				self.reloadNum = 1;
			} else
				self.reloadNum = 0;
		} else if (self.tankType === 9) {
			if (self.reloadNum == 0) {
				var b1 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
				var b2 = Bullet(self.id, angle - 2 * 360 / 10, self.bulletHp,
						self.bulletSpeed, ax, ay);
				var b3 = Bullet(self.id, angle - 4 * 360 / 10, self.bulletHp,
						self.bulletSpeed, ax, ay);
				var b4 = Bullet(self.id, angle - 6 * 360 / 10, self.bulletHp,
						self.bulletSpeed, ax, ay);
				var b5 = Bullet(self.id, angle - 8 * 360 / 10, self.bulletHp,
						self.bulletSpeed, ax, ay);
				self.reloadNum = 1;
			} else if (self.reloadNum == 1) {
				var b1 = Bullet(self.id, angle - 1 * 360 / 10, self.bulletHp,
						self.bulletSpeed, ax, ay);
				var b2 = Bullet(self.id, angle - 3 * 360 / 10, self.bulletHp,
						self.bulletSpeed, ax, ay);
				var b3 = Bullet(self.id, angle - 5 * 360 / 10, self.bulletHp,
						self.bulletSpeed, ax, ay);
				var b4 = Bullet(self.id, angle - 7 * 360 / 10, self.bulletHp,
						self.bulletSpeed, ax, ay);
				var b5 = Bullet(self.id, angle - 9 * 360 / 10, self.bulletHp,
						self.bulletSpeed, ax, ay);
				self.reloadNum = 0;
			}
		} else if (self.tankType === 10) {
			if (self.reloadNum == 0) {
				self.spdX -= Math.cos(angle / 180 * Math.PI) * 0.5 * damping;
				self.spdY -= Math.sin(angle / 180 * Math.PI) * 0.5 * damping;
				var b1 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
				self.reloadNum = 1;
			} else if (self.reloadNum == 1) {
				self.spdX += Math.cos(angle / 180 * Math.PI) * 0.5 * damping;
				self.spdY += Math.sin(angle / 180 * Math.PI) * 0.5 * damping;
				var b1 = Bullet(self.id, angle - 180, self.bulletHp,
						self.bulletSpeed, ax, ay);
				self.reloadNum = 0;
			}
		} else if (self.tankType === 11) {
			self.spdX -= Math.cos(angle / 180 * Math.PI) * 0.5 * damping;
			self.spdY -= Math.sin(angle / 180 * Math.PI) * 0.5 * damping;
			var b = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
		} else if (self.tankType === 12) {
			self.spdX -= Math.cos(angle / 180 * Math.PI) * 0.5 * damping;
			self.spdY -= Math.sin(angle / 180 * Math.PI) * 0.5 * damping;
			var b = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
		} else if (self.tankType === 13) {
			if (self.reloadNum == 0) {
				var b1 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
				var b2 = Bullet(self.id, angle - 2 * 360 / 4, self.bulletHp,
						self.bulletSpeed, ax, ay);
				self.reloadNum = 1;
			} else if (self.reloadNum == 1) {
				var b1 = Bullet(self.id, angle - 1 * 360 / 4, self.bulletHp,
						self.bulletSpeed, ax, ay);
				var b2 = Bullet(self.id, angle - 3 * 360 / 4, self.bulletHp,
						self.bulletSpeed, ax, ay);
				self.reloadNum = 0;
			}
		} else if (self.tankType === 14) {
			self.spdX -= Math.cos(angle / 180 * Math.PI) * 2 * damping;
			self.spdY -= Math.sin(angle / 180 * Math.PI) * 2 * damping;
			var b1 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
			var b2 = Bullet(self.id, angle - 1 * 360 / 9, self.bulletHp,
					self.bulletSpeed, ax, ay);
			var b3 = Bullet(self.id, angle + 1 * 360 / 9, self.bulletHp,
					self.bulletSpeed, ax, ay);
			} else if (self.tankType === 15) {
			if (self.bullets.length < 20) {
				var b = Bullet(self.id, angle, self.bulletHp,
						self.bulletSpeed / 2, ax, ay, true);
				self.bullets.push(b);
			}
		} else if (self.tankType === 16) {
			self.spdX -= Math.cos(angle / 180 * Math.PI) * 3 * damping;
			self.spdY -= Math.sin(angle / 180 * Math.PI) * 3 * damping;

			ax = self.x - Math.cos(turbAngle * Math.PI / 180) * 17;
			ay = self.y - Math.sin(turbAngle * Math.PI / 180) * 17;
			var b1 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
		} else if (self.tankType === 17) {
			turbAngle = -90 + turbAngle;
			if (self.reloadNum == 0) {
				self.spdX -= Math.cos(angle / 180 * Math.PI) * 0.5 * damping;
				self.spdY -= Math.sin(angle / 180 * Math.PI) * 0.5 * damping;

				ax = self.x - Math.cos(turbAngle * Math.PI / 180) * 10;
				ay = self.y - Math.sin(turbAngle * Math.PI / 180) * 10;
				var b1 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);

				ax = self.x + Math.cos(turbAngle * Math.PI / 180) * 10;
				ay = self.y + Math.sin(turbAngle * Math.PI / 180) * 10;
				var b2 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);

				self.reloadNum = 1;
			} else if (self.reloadNum == 1) {
				self.spdX -= Math.cos(angle / 180 * Math.PI) * 0.5 * damping;
				self.spdY -= Math.sin(angle / 180 * Math.PI) * 0.5 * damping;

				ax = self.x - Math.cos(turbAngle * Math.PI / 180) * 20;
				ay = self.y - Math.sin(turbAngle * Math.PI / 180) * 20;
				var b1 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);

				ax = self.x + Math.cos(turbAngle * Math.PI / 180) * 20;
				ay = self.y + Math.sin(turbAngle * Math.PI / 180) * 20;
				var b2 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);

				self.reloadNum = 0;
			}
		} else if (self.tankType === 18) {

			turbAngle = -90 + turbAngle;
			if (self.reloadNum == 0) {
				self.spdX -= Math.cos(angle / 180 * Math.PI) * 0.5 * damping;
				self.spdY -= Math.sin(angle / 180 * Math.PI) * 0.5 * damping;

				ax = self.x - Math.cos(turbAngle * Math.PI / 180) * 7;
				ay = self.y - Math.sin(turbAngle * Math.PI / 180) * 7;
				var b1 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);

				ax = self.x + Math.cos(turbAngle * Math.PI / 180) * 7;
				ay = self.y + Math.sin(turbAngle * Math.PI / 180) * 7;
				var b2 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);

				self.reloadNum = 1;
			} else if (self.reloadNum == 1) {
				self.spdX -= Math.cos(angle / 180 * Math.PI) * 0.5 * damping;
				self.spdY -= Math.sin(angle / 180 * Math.PI) * 0.5 * damping;

				ax = self.x - Math.cos(turbAngle * Math.PI / 180) * 14;
				ay = self.y - Math.sin(turbAngle * Math.PI / 180) * 14;
				var b1 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);

				ax = self.x + Math.cos(turbAngle * Math.PI / 180) * 14;
				ay = self.y + Math.sin(turbAngle * Math.PI / 180) * 14;
				var b2 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);

				self.reloadNum = 2;
			} else if (self.reloadNum == 2) {
				self.spdX -= Math.cos(angle / 180 * Math.PI) * 0.5 * damping;
				self.spdY -= Math.sin(angle / 180 * Math.PI) * 0.5 * damping;

				ax = self.x - Math.cos(turbAngle * Math.PI / 180) * 21;
				ay = self.y - Math.sin(turbAngle * Math.PI / 180) * 21;
				var b1 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);

				ax = self.x + Math.cos(turbAngle * Math.PI / 180) * 21;
				ay = self.y + Math.sin(turbAngle * Math.PI / 180) * 21;
				var b2 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);

				self.reloadNum = 0;
			}
		} else if (self.tankType === 19) {
			if (self.reloadNum == 0) {
				self.spdX -= Math.cos(angle / 180 * Math.PI) * 3 * damping;
				self.spdY -= Math.sin(angle / 180 * Math.PI) * 3 * damping;

				ax = self.x - Math.cos(turbAngle * Math.PI / 180) * 17;
				ay = self.y - Math.sin(turbAngle * Math.PI / 180) * 17;
				var b1 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);

				self.reloadNum = 1;
			} else if (self.reloadNum == 1) {
				self.spdX -= Math.cos((angle + 180) / 180 * Math.PI) * 3
						* damping;
				self.spdY -= Math.sin((angle + 180) / 180 * Math.PI) * 3
						* damping;
				ax = self.x - Math.cos((turbAngle + 180) * Math.PI / 180)
				* 17;
				ay = self.y - Math.sin((turbAngle + 180) * Math.PI / 180)
				* 17;
				var b1 = Bullet(self.id, angle + 180, self.bulletHp,
						self.bulletSpeed, ax, ay);
				self.reloadNum = 0;
			}
		} else if (self.tankType === 20) {

			self.spdX -= Math.cos(angle / 180 * Math.PI) * 3 * damping;
			self.spdY -= Math.sin(angle / 180 * Math.PI) * 3 * damping;

			angle -= 8;
			turbAngle -= 8;

			ax = self.x - Math.cos(turbAngle * Math.PI / 180) * 17;
			ay = self.y - Math.sin(turbAngle * Math.PI / 180) * 17;
			var b1 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);

			angle += 8;
			turbAngle += 8;
			ax = self.x - Math.cos(turbAngle * Math.PI / 180) * 17;
			ay = self.y - Math.sin(turbAngle * Math.PI / 180) * 17;
			var b2 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);

		} else if (self.tankType === 21) {
			self.spdX -= Math.cos(angle / 180 * Math.PI) * 1.5 * damping;
			self.spdY -= Math.sin(angle / 180 * Math.PI) * 1.5 * damping;
			if (self.reloadNum == 0) {
				var b1 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
				var b2 = Bullet(self.id, angle - 1 * 360 / 9, self.bulletHp,
						self.bulletSpeed, ax, ay);
				var b3 = Bullet(self.id, angle + 1 * 360 / 9, self.bulletHp,
						self.bulletSpeed, ax, ay);
				self.reloadNum = 1;
			} else if (self.reloadNum == 1) {
				var b1 = Bullet(self.id, angle + 1 * 360 / 18, self.bulletHp,
						self.bulletSpeed, ax, ay);
				var b2 = Bullet(self.id, angle - 1 * 360 / 18, self.bulletHp,
						self.bulletSpeed, ax, ay);
				self.reloadNum = 0;
			}
		} else if (self.tankType === 22) {
			self.spdX -= Math.cos(angle / 180 * Math.PI) * 0.5 * damping;
			self.spdY -= Math.sin(angle / 180 * Math.PI) * 0.5 * damping;
			var b = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
		} else if (self.tankType === 24) {
			if (self.reloadNum == 0) {
				self.spdX -= Math.cos(angle / 180 * Math.PI) * 0.5 * damping;
				self.spdY -= Math.sin(angle / 180 * Math.PI) * 0.5 * damping;
				var b = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
				b.stationary = true;
				self.reloadNum = 1;
			} else if (self.reloadNum == 1) {
				angle -= 120;
				self.spdX -= Math.cos(angle / 180 * Math.PI) * 0.5 * damping;
				self.spdY -= Math.sin(angle / 180 * Math.PI) * 0.5 * damping;
				var b = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
				b.stationary = true;
				self.reloadNum = 2;
			} else if (self.reloadNum == 2) {
				angle -= 240;
				self.spdX -= Math.cos(angle / 180 * Math.PI) * 0.5 * damping;
				self.spdY -= Math.sin(angle / 180 * Math.PI) * 0.5 * damping;
				var b = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
				b.stationary = true;
				self.reloadNum = 0;
			}
		} else if (self.tankType === 25) {
			if (self.reloadNum == 0) {
				self.spdX -= Math.cos(angle / 180 * Math.PI) * 0.5 * damping;
				self.spdY -= Math.sin(angle / 180 * Math.PI) * 0.5 * damping;
				var b = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
				b.stationary = true;
				self.reloadNum = 1;
			} else if (self.reloadNum == 1) {
				angle -= 20;
				self.spdX -= Math.cos(angle / 180 * Math.PI) * 1 * damping;
				self.spdY -= Math.sin(angle / 180 * Math.PI) * 1 * damping;
				var b = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
				b.stationary = true;

				angle += 40;
				var b2 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
				b2.stationary = true;
				self.reloadNum = 2;
			} else if (self.reloadNum == 2) {
				angle -= 40;
				self.spdX -= Math.cos(angle / 180 * Math.PI) * 1 * damping;
				self.spdY -= Math.sin(angle / 180 * Math.PI) * 1 * damping;
				var b = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
				b.stationary = true;

				angle += 80;
				var b2 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
				b2.stationary = true;
				self.reloadNum = 3;
			} else if (self.reloadNum == 3) {
				angle -= 60;
				self.spdX -= Math.cos(angle / 180 * Math.PI) * 1 * damping;
				self.spdY -= Math.sin(angle / 180 * Math.PI) * 1 * damping;
				var b = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
				b.stationary = true;

				angle += 120;
				var b2 = Bullet(self.id, angle, self.bulletHp, self.bulletSpeed, ax, ay);
				b2.stationary = true;
				self.reloadNum = 0;
			}
		}

	}
	self.deathReset = function() {
		removePack.player.push(self.id);
		delete Player.list[self.id];
		//if(self.isAI) numOfAIPlayers--;
		/*removePack.player.push(self.id);

		self.hp = self.hpMax;
		self.x = Math.random() * GAME_DIMENSION;
		self.y = Math.random() * GAME_DIMENSION;
		self.level = Math.round(self.level / 2);
		self.score = self.evaluateNextLevelScore(self.level);
		self.upgrades = self.level;
		self.regenCount = 0;
		self.hpMaxCount = 0;
		self.bulletHpCount = 0;
		self.bulletSpeedCount = 0;
		self.reloadCount = 0;
		self.maxSpdCount = 0;
		self.bodyDamageCount = 0;
		self.needToUpdate = true;*/
	}
	self.regdden = function() {
		if (self.timer % self.regen == 0) {
			if (self.hp < self.hpMax)
				self.hp++;
		}
	}
	self.updateSpd = function() {
		/*if(self.pressingRight && self.pressingUp && self.x < GAME_DIMENSION && self.y > 0
			&& self.spdX < self.maxSpd * Math.sqrt(2) / 5
			&& self.spdY > -self.maxSpd * Math.sqrt(2) / 5){
				self.spdX++;
				self.spdY--;
		} else if(self.pressingRight && self.pressingDown && self.x < GAME_DIMENSION && self.y < GAME_DIMENSION
				&& self.spdX < self.maxSpd * Math.sqrt(2) / 5
				&& self.spdY < self.maxSpd * Math.sqrt(2) / 5){
					self.spdX++;
					self.spdY++;
		} else if(self.pressingLeft && self.pressingUp && self.x > 0 && self.y > 0
				&& self.spdX > -self.maxSpd * Math.sqrt(2) / 2
				&& self.spdY > -self.maxSpd * Math.sqrt(2) / 2){
					self.spdX--;
					self.spdY--;
		} else if(self.pressingLeft && self.pressingDown && self.x > 0 && self.y < GAME_DIMENSION
				&& self.spdX > -self.maxSpd * Math.sqrt(2) / 2
				&& self.spdY < self.maxSpd * Math.sqrt(2) / 2){
					self.spdX--;
					self.spdY++;
		} else {

		}*/

		if (self.pressingRight && self.x < GAME_DIMENSION) {
			if (self.spdX < self.maxSpd)
				self.spdX++;
		} else if (self.pressingLeft && self.x > 0) {
			if (self.spdX > -self.maxSpd)
				self.spdX--;
		}

		if (self.pressingUp && self.y > 0) {
			if (self.spdY > -self.maxSpd)
				self.spdY--;
		} else if (self.pressingDown && self.y < GAME_DIMENSION) {
			if (self.spdY < self.maxSpd)
				self.spdY++;
		}

		self.spdX *= self.friction;
		self.spdY *= self.friction;

	}

	self.getInitPack = function() {
		return {
			id : self.id,
			x : self.x,
			y : self.y,
			number : self.number,
			hp : self.hp,
			hpMax : self.hpMax,
			score : self.score,
			name : self.name,
			tankType : self.tankType,
		};
	}
	self.getUpdatePack = function() {
		var pack = {

		};
		if (self.updateX){
			pack.x = self.x;
			self.updateX = false;
		}
		if (self.updateY){
			pack.y = self.y;
			self.updateY = false;
		}
		if (self.updateRegen) {
			pack.regen = self.regenCount;
			self.updateRegen = false;
		}
		if (self.updateHpMax) {
			pack.maxhp = self.hpMaxCount;
			pack.pMaxHp = self.hpMax;
			self.updateHpMax = false;
		}
		if (self.updateBulletHp) {
			pack.bulletHp = self.bulletHpCount;
			self.updateBulletHp = false;
		}
		if (self.updateBulletSpeed) {
			pack.bulletSpeed = self.bulletSpeedCount;
			self.updateBulletSpeed = false;
		}
		if (self.updateReload) {
			pack.bulletReload = self.reloadCount;
			self.updateReload = false;
		}
		if (self.updateSpeed) {
			pack.movementSpeed = self.maxSpdCount;
			self.updateSpeed = false;
		}
		if (self.updateBodyDamage) {
			pack.bodyDamage = self.bodyDamageCount;
			self.updateBodyDamage = false;
		}
		if (self.updatePenetration) {
			pack.penetration = self.penetrationCount;
			self.updatePenetration = false;
		}

		if (self.updateHp) {
			pack.hp = self.hp;
			self.updateHp = false;
		}
		if (self.updateScore) {
			pack.score = self.score;
			self.updateScore = false;
		}
		if (self.updateUpgrades) {
			pack.upgrades = self.upgrades;
			self.updateUpgrades = false;
		}
		if (self.updateTankType) {
			pack.tankType = self.tankType;
			self.updateTankType = false;
		}
		if (self.updateLevel) {
			pack.level = self.level;
			self.updateLevel = false;
		}
		if (self.updateMouseAngle) {
			pack.mouseAngle = self.mouseAngle;
			self.updateMonseAngle = false;
		}
<<<<<<< HEAD
=======
		if(Object.keys(pack).length !== 0){
			pack.id = self.id;
		}
>>>>>>> 91fab3a9fdb1f32bcaa99edb80bfe198609314fe

		return pack;
	}

	Player.list[id] = self;

	initPack.player.push(self.getInitPack());
	return self;
}

function rotate_point(cx, cy, angle, p) {

	var s = Math.sin(angle);
	var c = Math.cos(angle);

	p.x -= cx;
	p.y -= cy;

	var xnew = p.x * c - p.y * s;
	var ynew = p.x * s + p.y * c;

	p.x = xnew + cx;
	p.y = ynew + cy;
	return p;
}

Player.list = {};
Player.matrix = [];
Player.tankProps = [ {	name : 'base tank',	minRegen : 8,	maxRegen : 21,	minSpeed : 6,	maxSpeed : 10,	minHp : 100,	maxHp : 200,	minBulletHp : 7,	maxBulletHp : 30,	minBulletSpeed : 7,	maxBulletSpeed : 25,	minReload : 11,	maxReload : 38,	minBodyDamage : 10,	maxBodyDamage : 200,	minPenetration : 10,	maxPenetration : 60},
                     {	name : 'twin',	minRegen : 6,	maxRegen : 21,	minSpeed : 6,	maxSpeed : 9,	minHp : 100,	maxHp : 160,	minBulletHp : 10,	maxBulletHp : 50,	minBulletSpeed : 5,	maxBulletSpeed : 20,	minReload : 3,	maxReload : 21,	minBodyDamage : 10,	maxBodyDamage : 200,	minPenetration : 10,	maxPenetration : 60},
                     {	name : 'triplet',	minRegen : 4,	maxRegen : 21,	minSpeed : 6,	maxSpeed : 10,	minHp : 100,	maxHp : 170,	minBulletHp : 10,	maxBulletHp : 55,	minBulletSpeed : 5,	maxBulletSpeed : 23,	minReload : 3,	maxReload : 21,	minBodyDamage : 10,	maxBodyDamage : 200,	minPenetration : 10,	maxPenetration : 60},
                     {	name : 'octotank',	minRegen : 4,	maxRegen : 21,	minSpeed : 6,	maxSpeed : 10,	minHp : 100,	maxHp : 180,	minBulletHp : 10,	maxBulletHp : 40,	minBulletSpeed : 15,	maxBulletSpeed : 23,	minReload : 4,	maxReload : 21,	minBodyDamage : 10,	maxBodyDamage : 200,	minPenetration : 10,	maxPenetration : 60},
                     {	name : 'triple twin',	minRegen : 4,	maxRegen : 21,	minSpeed : 6,	maxSpeed : 10,	minHp : 100,	maxHp : 180,	minBulletHp : 10,	maxBulletHp : 40,	minBulletSpeed : 15,	maxBulletSpeed : 23,	minReload : 4,	maxReload : 21,	minBodyDamage : 10,	maxBodyDamage : 200,	minPenetration : 10,	maxPenetration : 60},
                     {	name : 'triangle',	minRegen : 4,	maxRegen : 21,	minSpeed : 6,	maxSpeed : 10,	minHp : 100,	maxHp : 180,	minBulletHp : 10,	maxBulletHp : 40,	minBulletSpeed : 15,	maxBulletSpeed : 23,	minReload : 4,	maxReload : 21,	minBodyDamage : 80,	maxBodyDamage : 280,	minPenetration : 10,	maxPenetration : 60},
                     {	name : 'booster',	minRegen : 2,	maxRegen : 17,	minSpeed : 6,	maxSpeed : 10,	minHp : 100,	maxHp : 180,	minBulletHp : 10,	maxBulletHp : 40,	minBulletSpeed : 15,	maxBulletSpeed : 23,	minReload : 4,	maxReload : 21,	minBodyDamage : 130,	maxBodyDamage : 360,	minPenetration : 10,	maxPenetration : 60},
                     {	name : 'overseer',	minRegen : 4,	maxRegen : 21,	minSpeed : 6,	maxSpeed : 10,	minHp : 100,	maxHp : 180,	minBulletHp : 10,	maxBulletHp : 80,	minBulletSpeed : 15,	maxBulletSpeed : 23,	minReload : 4,	maxReload : 21,	minBodyDamage : 10,	maxBodyDamage : 200,	minPenetration : 10,	maxPenetration : 60},
                     {	name : 'twin flank',	minRegen : 4,	maxRegen : 21,	minSpeed : 6,	maxSpeed : 10,	minHp : 100,	maxHp : 180,	minBulletHp : 10,	maxBulletHp : 40,	minBulletSpeed : 15,	maxBulletSpeed : 23,	minReload : 4,	maxReload : 21,	minBodyDamage : 10,	maxBodyDamage : 200,	minPenetration : 10,	maxPenetration : 60},
                     {	name : 'decatank',	minRegen : 4,	maxRegen : 21,	minSpeed : 6,	maxSpeed : 10,	minHp : 100,	maxHp : 180,	minBulletHp : 10,	maxBulletHp : 40,	minBulletSpeed : 15,	maxBulletSpeed : 23,	minReload : 4,	maxReload : 21,	minBodyDamage : 10,	maxBodyDamage : 200,	minPenetration : 10,	maxPenetration : 60},
                     {	name : 'flank guard',	minRegen : 3,	maxRegen : 18,	minSpeed : 6,	maxSpeed : 10,	minHp : 100,	maxHp : 180,	minBulletHp : 10,	maxBulletHp : 40,	minBulletSpeed : 15,	maxBulletSpeed : 23,	minReload : 4,	maxReload : 21,	minBodyDamage : 60,	maxBodyDamage : 260,	minPenetration : 10,	maxPenetration : 60},
                     {	name : 'machine gun',	minRegen : 4,	maxRegen : 21,	minSpeed : 6,	maxSpeed : 10,	minHp : 100,	maxHp : 180,	minBulletHp : 10,	maxBulletHp : 40,	minBulletSpeed : 15,	maxBulletSpeed : 23,	minReload : 2,	maxReload : 16,	minBodyDamage : 10,	maxBodyDamage : 200,	minPenetration : 10,	maxPenetration : 60},
                     {	name : 'sniper',	minRegen : 4,	maxRegen : 21,	minSpeed : 8,	maxSpeed : 12,	minHp : 100,	maxHp : 180,	minBulletHp : 10,	maxBulletHp : 100,	minBulletSpeed : 15,	maxBulletSpeed : 23,	minReload : 25,	maxReload : 50,	minBodyDamage : 10,	maxBodyDamage : 200,	minPenetration : 30,	maxPenetration : 80},
                     {	name : 'quad tank',	minRegen : 4,	maxRegen : 21,	minSpeed : 6,	maxSpeed : 10,	minHp : 100,	maxHp : 180,	minBulletHp : 10,	maxBulletHp : 40,	minBulletSpeed : 15,	maxBulletSpeed : 23,	minReload : 4,	maxReload : 21,	minBodyDamage : 10,	maxBodyDamage : 200,	minPenetration : 10,	maxPenetration : 60},
                     {	name : 'triple shot',	minRegen : 4,	maxRegen : 21,	minSpeed : 6,	maxSpeed : 10,	minHp : 100,	maxHp : 180,	minBulletHp : 10,	maxBulletHp : 40,	minBulletSpeed : 15,	maxBulletSpeed : 23,	minReload : 4,	maxReload : 21,	minBodyDamage : 10,	maxBodyDamage : 200,	minPenetration : 10,	maxPenetration : 60},
                     {	name : 'overlord',	minRegen : 4,	maxRegen : 21,	minSpeed : 6,	maxSpeed : 10,	minHp : 100,	maxHp : 180,	minBulletHp : 10,	maxBulletHp : 100,	minBulletSpeed : 15,	maxBulletSpeed : 23,	minReload : 4,	maxReload : 21,	minBodyDamage : 10,	maxBodyDamage : 200,	minPenetration : 10,	maxPenetration : 60},
                     {	name : 'destroyer',	minRegen : 4,	maxRegen : 21,	minSpeed : 6,	maxSpeed : 10,	minHp : 150,	maxHp : 300,	minBulletHp : 70,	maxBulletHp : 270,	minBulletSpeed : 8,	maxBulletSpeed : 15,	minReload : 30,	maxReload : 80,	minBodyDamage : 150,	maxBodyDamage : 365,	minPenetration : 10,	maxPenetration : 60},
                     {	name : 'gunner',	minRegen : 4,	maxRegen : 21,	minSpeed : 6,	maxSpeed : 10,	minHp : 100,	maxHp : 180,	minBulletHp : 7,	maxBulletHp : 30,	minBulletSpeed : 19,	maxBulletSpeed : 30,	minReload : 3,	maxReload : 18,	minBodyDamage : 150,	maxBodyDamage : 365,	minPenetration : 10,	maxPenetration : 60},
                     {	name : 'hexagunner',	minRegen : 4,	maxRegen : 21,	minSpeed : 6,	maxSpeed : 10,	minHp : 100,	maxHp : 180,	minBulletHp : 7,	maxBulletHp : 32,	minBulletSpeed : 19,	maxBulletSpeed : 30,	minReload : 2,	maxReload : 16,	minBodyDamage : 10,	maxBodyDamage : 200,	minPenetration : 10,	maxPenetration : 60},
                     {	name : 'flank destroyer',	minRegen : 4,	maxRegen : 21,	minSpeed : 6,	maxSpeed : 10,	minHp : 150,	maxHp : 300,	minBulletHp : 70,	maxBulletHp : 280,	minBulletSpeed : 8,	maxBulletSpeed : 15,	minReload : 30,	maxReload : 80,	minBodyDamage : 150,	maxBodyDamage : 369,	minPenetration : 10,	maxPenetration : 60},
                     {	name : 'twin destroyer',	minRegen : 4,	maxRegen : 21,	minSpeed : 6,	maxSpeed : 10,	minHp : 150,	maxHp : 300,	minBulletHp : 70,	maxBulletHp : 280,	minBulletSpeed : 8,	maxBulletSpeed : 15,	minReload : 30,	maxReload : 80,	minBodyDamage : 150,	maxBodyDamage : 369,	minPenetration : 10,	maxPenetration : 60},
                     {	name : 'penta shot',	minRegen : 4,	maxRegen : 21,	minSpeed : 6,	maxSpeed : 10,	minHp : 100,	maxHp : 180,	minBulletHp : 10,	maxBulletHp : 40,	minBulletSpeed : 15,	maxBulletSpeed : 23,	minReload : 4,	maxReload : 21,	minBodyDamage : 10,	maxBodyDamage : 200,	minPenetration : 10,	maxPenetration : 60},
                     {	name : 'flak cannon',	minRegen : 4,	maxRegen : 21,	minSpeed : 6,	maxSpeed : 10,	minHp : 100,	maxHp : 180,	minBulletHp : 10,	maxBulletHp : 131,	minBulletSpeed : 15,	maxBulletSpeed : 23,	minReload : 4,	maxReload : 21,	minBodyDamage : 10,	maxBodyDamage : 200,	minPenetration : 10,	maxPenetration : 60},
                     {	name : 'landmine',	minRegen : 4,	maxRegen : 21,	minSpeed : 6,	maxSpeed : 10,	minHp : 150,	maxHp : 300,	minBulletHp : 70,	maxBulletHp : 270,	minBulletSpeed : 8,	maxBulletSpeed : 15,	minReload : 30,	maxReload : 80,	minBodyDamage : 150,	maxBodyDamage : 369,	minPenetration : 10,	maxPenetration : 60},
                     {	name : 'trapper',	minRegen : 4,	maxRegen : 21,	minSpeed : 6,	maxSpeed : 10,	minHp : 150,	maxHp : 300,	minBulletHp : 70,	maxBulletHp : 270,	minBulletSpeed : 15,	maxBulletSpeed : 25,	minReload : 5,	maxReload : 10,	minBodyDamage : 150,	maxBodyDamage : 369,	minPenetration : 10,	maxPenetration : 60},
                     {	name : 'heptashot',	minRegen : 4,	maxRegen : 21,	minSpeed : 6,	maxSpeed : 10,	minHp : 150,	maxHp : 300,	minBulletHp : 70,	maxBulletHp : 270,	minBulletSpeed : 15,	maxBulletSpeed : 25,	minReload : 2,	maxReload : 10,	minBodyDamage : 150,	maxBodyDamage : 369,	minPenetration : 10,	maxPenetration : 60}, ];
Player.onConnect = function(socket, username) {
	var player = new Player(socket.id, username);
	socket.on('keyPress', function(data) {
		if (data.inputId === 'left')
			player.pressingLeft = data.state;
		else if (data.inputId === 'right')
			player.pressingRight = data.state;
		else if (data.inputId === 'up')
			player.pressingUp = data.state;
		else if (data.inputId === 'down')
			player.pressingDown = data.state;
		else if (data.inputId === 'attack') {
			player.pressingAttack = data.state;
		} else if (data.inputId === 'mouseAngle') {
			player.mouseAngle = data.state;
			player.updateMouseAngle = true;
			player.mouseX = data.mouseX;
			player.mouseY = data.mouseY;
		}
	});

	socket.emit('allUpdate', {
		init : {
			selfId : socket.id,
			player : Player.getAllInitPack(),
			bullet : Bullet.getAllInitPack(),
			square : Square.getAllInitPack(),
			pentagon : Pentagon.getAllInitPack(),
			triangle : Triangle.getAllInitPack()
		}
	})
}
Player.getAllInitPack = function() {
	var players = [];
	for ( var i in Player.list)
		players.push(Player.list[i].getInitPack());
	return players;
}

Player.onDisconnect = function(socket) {
	delete Player.list[socket.id];
	removePack.player.push(socket.id);
}
Player.updatePack = {};
var collisions = [];

function include(arr, obj) {
	return (arr.indexOf(obj) != -1);
}
Player.initSectors = function() {
	for(var i = 0; i < 10; i++){
		Player.matrix[i] = [];
		for(var j = 0; j < 10; j++){
			Player.matrix[i][j] = [];
		}
	}
	playerFirst = false;
}
function mergeUpdatePacks(past,current,index){

}
var chars = "档换是不了在人有我他这个们中来上大为和国地到以说时要就出会可也你对生能而子那得于着下自之年过发后作里用道行所然家种事成方多经么去法学如都同现当没动面起看定天分还进好小部";

var surname = "李王张刘陈杨赵黄周吴徐孙胡朱高林何郭";
var numOfAIPlayers = 0;
Player.regUpdate = function() {
<<<<<<< HEAD

=======
	if(numOfAIPlayers <= 15){
		var surIndex = Math.floor(Math.random() * surname.length);
		var charIndex = Math.floor(Math.random() * chars.length);
		var name = surname.substring(surIndex, surIndex + 1) + chars.substring(charIndex, charIndex + 1);
		var p = Player(parseFloat(Math.random().toFixed(6)), name, true);

		while((p.tankType = Math.round(Math.random() * 20 + 1)) == 7 ||
				(p.tankType = Math.round(Math.random() * 20 + 1)) == 15){
			p.tankType = Math.round(Math.random() * 20 + 1);
		}
		numOfAIPlayers++;
	}
>>>>>>> 91fab3a9fdb1f32bcaa99edb80bfe198609314fe
	for ( var i in Player.list) {
		var player = Player.list[i];
		if (player.hp <= 0) {
			player.deathReset();
		} else {
			player.update();
		}
		var playerDetected = false;
		var minDist = 500000;
		var minX = 0;
		var minY = 0;
		for ( var i in Player.list) {
			var p = Player.list[i];
			if (p.id != player.id) {
				if (!include(collisions, p.id + "," + player.id)) {
					var dist = player.getDistance(p);
					if(player.isAI && dist < minDist){
						minDist = dist;
						minX = p.x;
						minY = p.y;
						if(!playerDetected) playerDetected = true;
					}
					if (player.getDistance(p) < 15) {
						var angle = Math.atan2(player.y - p.y, player.x - p.x);
						p.spdX += Math.cos(angle) * 32 / 100;
						p.spdY -= Math.sin(angle) * 32 / 100;
						player.spdX += Math.cos(angle) * 32 / 100;
						player.spdY -= Math.sin(angle) * 32 / 100;
						p.hp -= Math.round(player.bodyDamage / 7);
						player.hp -= Math.round(p.bodyDamage / 7);
						if (p.hp <= 0){
							messages = player.name + " 杀死了 " + p.name + "!";
							p.deathReset();
						} else if (player.hp <= 0){
							player.deathReset();
							messages = p.name + " 杀死了 " + player.name + "!";
						}
						collisions.push(player.id + "," + p.id);
					}
				}
			}
		}

		if(!playerDetected && player.isAI){
			for(var s in Square.matrix[player.xSector][player.ySector]){
				var dist = getDistance(s, player);
				if(dist < minDist){
					minDist = dist;
					minX = s.x;
					minY = s.y;
				}
			}
		}
		if(player.isAI){
			minX = minX - player.x;
			minY = minY - player.y;

			player.spdX = minX * player.maxSpd / minDist;
			player.spdY = minY * player.maxSpd / minDist;

			player.mouseAngle = parseFloat((Math.atan2(minY, minX) * 180 / Math.PI).toFixed(2));
			player.pressingAttack = true;
		}
		collisions = [];
	}
}

Player.update = function(p) {
	var pack = [];

	for ( var i in Player.list) {
		var player = Player.list[i];
		if (objInViewOfPlayer(player, p)) {
			pack.push(player.getUpdatePack());
		}else if(p.newScore){
			var newObj = {};
			newObj.id = player.id;
			newObj.score = player.score;
			pack.push(newObj);
			p.newScore = false;
		}
	}

	return pack;
}
var t = 0;
var Shape = function() {
	var speed = 0.1;
	var angle = 0;
	var myX = parseFloat((Math.random() * GAME_DIMENSION).toFixed(2));
	var myY = parseFloat((Math.random() * GAME_DIMENSION).toFixed(2));
	var self = {
		id : parseFloat(Math.random().toFixed(8)),
		x : myX,
		y : myY,
		score : 0,
		hp : 0,
		maxhp : 0,
		friction : 0.95,
		angle : angle,
		toRemove : false,
		speed : 0,
		spdX : 0,
		spdY : 0,
		attacked : false,
		toRemove : false,
		dirChange : true,
		needToUpdate : false,
		xSector : 11,
		ySector : 11,
		type : "Shape"
	}

	self.update = function() {
		var oriX = self.x;
		var oriY = self.y;
		var x = Math.cos(self.angle / 180 * Math.PI) * self.speed;
		var y = Math.sin(self.angle / 180 * Math.PI) * self.speed;

		if (self.x + self.spdX < GAME_DIMENSION && self.x + self.spdX > 0) {
			self.x += self.spdX;
		}
		if (self.y + self.spdY < GAME_DIMENSION && self.y + self.spdY > 0) {
			self.y += self.spdY;
		}
		if(Player.matrix[self.xSector] === undefined) Player.initSectors();
		for ( var i in Player.matrix[self.xSector][self.ySector]) {
			var p = Player.matrix[self.xSector][self.ySector][i];
			if (self.getDistance(p) < 50) {
				self.attacked = true;
				p.hp -= Math.round((self.maxhp + 10) / 3)
						* (400 - p.bodyDamage) / 400;
				self.hp -= p.bodyDamage + 10;
				if (p.hp <= 0) {
					p.deathReset();
					messages = "A stupid NPC killed " + p.name + "!";
				} else if (self.hp <= 0) {
					p.score += self.score;
					p.updateScore = true;
				} else {
					var angle = Math.atan2(self.y - p.y, self.x - p.x);
					p.spdX -= Math.cos(angle) * 5;
					p.spdY -= Math.sin(angle) * 5;
				}
			}
		}
		if (Math.abs(self.spdX - x) > 0.1 || Math.abs(self.spdY - y) > 0.1) {
			self.spdX *= self.friction;
			self.spdY *= self.friction;
		} else {
			self.spdX = Math.cos(self.angle / 180 * Math.PI) * self.speed;
			self.spdY = Math.sin(self.angle / 180 * Math.PI) * self.speed;
		}
		if (self.hp > self.maxhp)
			self.hp = self.maxhp;

		if (self.attacked) {
			self.needToUpdate = true;
		} else {
			self.needToUpdate = false;
		}

		return {
			id : self.id,
			x : self.x,
			y : self.y,
			hp : self.hp,
			attacked : self.attacked,
		};
	}
	self.getDistance = function(pt) {
		return Math.sqrt(Math.pow(self.x - pt.x, 2)
				+ Math.pow(self.y - pt.y, 2));
	}
	self.deathReset = function() {
		self.x = Math.random() * GAME_DIMENSION;
		self.y = Math.random() * GAME_DIMENSION;
		self.hp = self.maxhp;
	}
	self.getInitPack = function() {
		return {
			id : self.id,
			x : self.x,
			y : self.y,
			maxhp : self.maxhp
		};
	}
	self.getUpdatePack = function() {
		var pack = {
			id : self.id,
			x : self.x,
			y : self.y,
			hp : self.hp,
		};
		if(self.attacked) pack.attacked = true;
		return pack;
	}
	return self;
}
var numOfFarmPentagons = 0;
var numOfAlphaPentagons = 0;
var pentagonFirst = true;
var Pentagon = function(x, y, radius) {
	var self = Shape();
	self.type = "Pentagon";
	if(x !== undefined){
		self.x = x;
		self.y = y;
	}

	if (typeof radius !== 'undefined') {
		self.radius = radius;
		self.score = 3000;
		self.hp = 10000;
		self.maxhp = 10000;
	} else {
		self.radius = 30;
		self.score = 130;
		self.hp = 130;
		self.maxhp = 130;
	}

	if(pentagonFirst){
		for(var i = 0; i < 10; i++){
			Pentagon.matrix[i] = [];
			for(var j = 0; j < 10; j++){
				Pentagon.matrix[i][j] = [];
			}
		}
		pentagonFirst = false;
	}

	var xSector = Math.floor(self.x / GAME_DIMENSION * 10);
	var ySector = Math.floor(self.y / GAME_DIMENSION * 10);
	self.xSector = xSector;
	self.ySector = ySector;
	Pentagon.matrix[xSector][ySector].push(self);

	self.getInitPack = function() {
		return {
			id : self.id,
			x : self.x,
			y : self.y,
			angle : self.angle,
			radius : self.radius,
			maxhp : self.maxhp,
		};
	}
	Pentagon.list[self.id] = self;
	initPack.pentagon.push(self.getInitPack());
	return self;
}
Pentagon.list = {};
Pentagon.matrix = [];

Pentagon.updatePack = {};


Pentagon.regUpdate = function() {

	if (numOfAlphaPentagons < 4) {
		var x = Math.floor(Math.random()
				* (GAME_DIMENSION * 6 / 9 - GAME_DIMENSION * 3 / 9 + 1)
				+ GAME_DIMENSION * 1 / 3);
		var y = Math.floor(Math.random()
				* (GAME_DIMENSION * 6 / 9 - GAME_DIMENSION * 3 / 9 + 1)
				+ GAME_DIMENSION * 1 / 3);
		var ap = Pentagon(x, y, 200);
		numOfAlphaPentagons++;
	}
	if (Object.keys(Pentagon.list).length < 126) {
		var x = 0;
		var y = 0;
		for (var i = 0; i < 3; i++) {
			x = Math.floor(Math.random()
					* (GAME_DIMENSION * 6 / 9 - GAME_DIMENSION * 3 / 9 + 1)
					+ GAME_DIMENSION * 1 / 3);
			y = Math.floor(Math.random()
					* (GAME_DIMENSION * 6 / 9 - GAME_DIMENSION * 3 / 9 + 1)
					+ GAME_DIMENSION * 1 / 3);
			var t = Pentagon(x, y);
			t.x = x;
			t.y = y;
		}
		x = Math.floor(Math.random() * GAME_DIMENSION);
		y = Math.floor(Math.random() * GAME_DIMENSION);
		var t = Pentagon(x, y);
	}
	for ( var i in Pentagon.list) {
		var pentagon = Pentagon.list[i];

		/*var xSector = Math.floor(pentagon.x / GAME_DIMENSION * 10);
		var ySector = Math.floor(pentagon.y / GAME_DIMENSION * 10);
		if(xSector != pentagon.xSector || ySector != pentagon.ySector){
			var index = Pentagon.matrix[pentagon.xSector][pentagon.ySector].indexOf(pentagon);
			Pentagon.matrix[pentagon.xSector][pentagon.ySector].splice(index, 1);
			Pentagon.matrix[xSector][ySector].push(pentagon);
		}*/

		if (pentagon.hp <= 0) {
			delete Pentagon.list[i];
			var sindex = Pentagon.matrix[pentagon.xSector][pentagon.ySector].indexOf(pentagon);
			Pentagon.matrix[pentagon.xSector][pentagon.ySector].splice(sindex, 1);
			removePack.pentagon.push(pentagon.id);
		} else if(pentagon.needToUpdate) {
			Pentagon.updatePack[pentagon.id] = pentagon.update();
		}
	}
}
var t = 0;
Pentagon.update = function(player) {
	var pack = [];

	for ( var i in Pentagon.updatePack) {
		var pentagon = Pentagon.list[i];
		if (pentagon !== undefined && objInViewOfPlayer(pentagon, player)) {
			pack.push(Pentagon.updatePack[pentagon.id]);
		}
	}

	return pack;
}

Pentagon.getAllInitPack = function() {
	var pentagons = [];
	for ( var i in Pentagon.list)
		pentagons.push(Pentagon.list[i].getInitPack());
	return pentagons;
}
var squareFirst = true;
var Square = function() {
	var self = Shape();
	self.score = 5000;
	self.hp = 10;
	self.maxhp = 10;
	self.type = "Square";
	if(squareFirst){
		for(var i = 0; i < 10; i++){
			Square.matrix[i] = [];
			for(var j = 0; j < 10; j++){
				Square.matrix[i][j] = [];
			}
		}
		squareFirst = false;
	}

	var xSector = Math.floor(self.x / GAME_DIMENSION * 10);
	var ySector = Math.floor(self.y / GAME_DIMENSION * 10);
	Square.matrix[xSector][ySector].push(self);
	self.xSector = xSector;
	self.ySector = ySector;

	Square.list[self.id] = self;
	initPack.square.push(self.getInitPack());
	return self;
}
Square.list = {};
Square.matrix = [];

Square.updatePack = {};

Square.regUpdate = function() {


	if (Object.keys(Square.list).length < 390) {
		var t = Square();
	}
	for ( var i in Square.list) {
		var square = Square.list[i];

		/*var xSector = Math.floor(square.x / GAME_DIMENSION * 10);
		var ySector = Math.floor(square.y / GAME_DIMENSION * 10);
		if(xSector != square.xSector || ySector != square.ySector){
			var index = Square.matrix[square.xSector][square.ySector].indexOf(square);
			Square.matrix[square.xSector][square.ySector].splice(index, 1);
			Square.matrix[xSector][ySector].push(square);
		}*/

		if (square.hp <= 0) {
			delete Square.list[i];
			var sindex = Square.matrix[square.xSector][square.ySector].indexOf(square);
			Square.matrix[square.xSector][square.ySector].splice(sindex, 1);
			removePack.square.push(square.id);
		} else {
			Square.updatePack[square.id] = square.update();
		}
	}
}

Square.update = function(player) {
	var pack = [];

	for ( var i in Square.updatePack) {
		var square = Square.list[i];
		if (square !== undefined && square.needToUpdate
				&& objInViewOfPlayer(square, player)) {
			pack.push(Square.updatePack[square.id]);
		}
	}

	return pack;
}

Square.getAllInitPack = function() {
	var squares = [];
	for ( var i in Square.list)
		squares.push(Square.list[i].getInitPack());
	return squares;
}
var triangleFirst = true;
var Triangle = function() {
	var self = Shape();
	self.score = 25;
	self.hp = 25;
	self.maxhp = 25;
	self.type = "Triangle";
	if(triangleFirst){
		for(var i = 0; i < 10; i++){
			Triangle.matrix[i] = [];
			for(var j = 0; j < 10; j++){
				Triangle.matrix[i][j] = [];
			}
		}
		triangleFirst = false;
	}

	var xSector = Math.floor(self.x / GAME_DIMENSION * 10);
	var ySector = Math.floor(self.y / GAME_DIMENSION * 10);
	Triangle.matrix[xSector][ySector].push(self);
	self.xSector = xSector;
	self.ySector = ySector;

	Triangle.list[self.id] = self;
	initPack.triangle.push(self.getInitPack());
	return self;
}
Triangle.list = {};
Triangle.matrix = [];

Triangle.updatePack = {};


Triangle.regUpdate = function() {

	if (Object.keys(Triangle.list).length < 150) {
		var t = new Triangle();
	}
	for ( var i in Triangle.list) {
		var triangle = Triangle.list[i];

		/*var xSector = Math.floor(triangle.x / GAME_DIMENSION * 10);
		var ySector = Math.floor(triangle.y / GAME_DIMENSION * 10);
		if(xSector != triangle.xSector || ySector != triangle.ySector){
			var index = Triangle.matrix[triangle.xSector][triangle.ySector].indexOf(triangle);
			Triangle.matrix[triangle.xSector][triangle.ySector].splice(index, 1);
			Triangle.matrix[xSector][ySector].push(triangle);
		}*/

		if (triangle.hp <= 0) {
			delete Triangle.list[i];
			var sindex = Triangle.matrix[triangle.xSector][triangle.ySector].indexOf(triangle);
			Triangle.matrix[triangle.xSector][triangle.ySector].splice(sindex, 1);
			removePack.triangle.push(triangle.id);
		} else {
			Triangle.updatePack[triangle.id] = triangle.update();
		}
	}
}

Triangle.update = function(player) {
	var pack = [];

	for ( var i in Triangle.updatePack) {
		var triangle = Triangle.list[i];
		if (triangle !== undefined && triangle.needToUpdate
				&& objInViewOfPlayer(triangle, player)) {
			pack.push(Triangle.updatePack[triangle.id]);
		}
	}

	return pack;
}

Triangle.getAllInitPack = function() {
	var triangles = [];
	for ( var i in Triangle.list)
		triangles.push(Triangle.list[i].getInitPack());
	return triangles;
}

var objInViewOfPlayer = function(obj, player) {
	var x = obj.x - player.x + WIDTH / 2;
	var y = obj.y - player.y + HEIGHT / 2;
	if (x >= -100 && x <= WIDTH + 100 && y >= -100 && y <= HEIGHT + 100)
		return true;
	else
		return false;
}

var pull = 0.7;
var t = 0;
var Bullet = function(parent, angle, hp, speed, x, y, drone, chaser) {
	var self = Entity();
	self.id = parseFloat(Math.random().toFixed(6));
	self.x = parseFloat(x.toFixed(3));
	self.y = parseFloat(y.toFixed(3));
	if (typeof drone == 'undefined') {
		drone = false;
	}
	self.type = 0;
	if(self.drone) self.type = 1;
	else if(self.trap) self.type = 2;
	else if(self.chaser) self.type = 3;
	if (typeof chaser == 'undefined') {
		self.chaser = false;
	} else
		self.chaser = true;
	self.penetration = Player.list[parent].penetration;
	self.drone = drone;
	self.hp = hp;
	if (drone) {
		self.speed = 10;
	} else {
		self.speed = speed;
	}
	self.angle = parseFloat(angle.toFixed(3));
	self.spdX = Math.cos(self.angle / 180 * Math.PI) * self.speed;
	self.spdY = Math.sin(self.angle / 180 * Math.PI) * self.speed;

<<<<<<< HEAD


=======
>>>>>>> 91fab3a9fdb1f32bcaa99edb80bfe198609314fe
	self.parent = parent;
	if (Player.list[self.parent].tankType == 24)
		self.trap = true;
	else
		self.trap = false;
	self.timer = 0;
	self.maxhp = hp;
	self.toRemove = false;
	self.stationary = false;
	self.friction = 1;

	self.xSector = Math.floor(self.x / GAME_DIMENSION * 10);
	self.ySector = Math.floor(self.y / GAME_DIMENSION * 10);

	var super_update = self.update;
	self.update = function() {
		self.xSector = Math.floor(self.x / GAME_DIMENSION * 10);
		self.ySector = Math.floor(self.y / GAME_DIMENSION * 10);

		if (!self.chaser) {
			if (!self.trap) {
				if (self.timer++ > 70 && !drone)
					self.toRemove = true;
			} else {
				if (self.timer++ > 500)
					self.toRemove = true;
			}
			self.x += self.spdX;
			self.y += self.spdY;

			if (!self.stationary) {
				self.spdX = Math.cos(self.angle / 180 * Math.PI) * self.speed;
				self.spdY = Math.sin(self.angle / 180 * Math.PI) * self.speed;
			}
		} else {

			var parent = Player.list[self.parent];
			if (parent == undefined){
				return;
			}
			var parentX = parent.x;
			var parentY = parent.y;

			var angle = Math.atan2(parentY - self.y, parentX - self.x);
			self.angle = angle;

			self.x += self.spdX;
			self.y += self.spdY;

			if (!self.stationary) {
				self.spdX = Math.cos(self.angle) * self.speed;
				self.spdY = Math.sin(self.angle) * self.speed;
			}
		}

		if (!self.drone) {
			for ( var b in Bullet.list) {
				var p = Bullet.list[b];
				if ((p.parent != self.parent || self.chaser || self.drone)
						&& !p.chaser) {
					if (self.getDistance(p) < 20) {
						if (self.hp > p.hp) {
							self.hp -= p.hp;
							p.hp = 0;
							p.toRemove = true;
						} else if (self.hp < p.hp) {
							p.hp -= self.hp;
							self.hp = 0;
							self.toRemove = true;
							if (self.chaser){
								Player.list[p.parent].score += 10;
								Player.list[p.parent].updateScore = true;
							}
						} else {
							p.hp = 0;
							self.hp = 0;
							self.toRemove = true;
							p.toRemove = true;
							if (self.chaser){
								Player.list[p.parent].score += 10;
								Player.list[p.parent].updateScore = true;
							}
						}
					}
				}
			}
		}

		if (t % 1 == 0) {
			if (Player.matrix[self.xSector] !== undefined) {
				for ( var i in Player.matrix[self.xSector][self.ySector]) {
					var p = Player.matrix[self.xSector][self.ySector][i];
					self.dealWithEntities(p);
				}
			}
			if (!self.chaser) {
				if (Square.matrix[self.xSector] !== undefined) {
					for ( var i in Square.matrix[self.xSector][self.ySector]) {
						var s = Square.matrix[self.xSector][self.ySector][i];
						self.dealWithEntities(s);
					}

				}
				if (Triangle.matrix[self.xSector] !== undefined) {
					for ( var i in Triangle.matrix[self.xSector][self.ySector]) {
						var s = Triangle.matrix[self.xSector][self.ySector][i];
						self.dealWithEntities(s);
					}
				}
				if (Pentagon.matrix[self.xSector] !== undefined) {
					for ( var i in Pentagon.matrix[self.xSector][self.ySector]) {
						var s = Pentagon.matrix[self.xSector][self.ySector][i];
						self.dealWithEntities(s);
					}
				}
			}
			t = 0;
		}
		t++;
	}
	self.dealWithEntities = function(s) {
		if ((s.id != self.parent || self.chaser) && !isNaN(self.hp) && Player.list[self.parent] !== undefined) {
			var radius = 55;
			if (self.getDistance(s) < radius) {
				var angle = Math.atan2(self.y - s.y, self.x - s.x);
				if (typeof s === "Player") {
					s.spdX -= Math.cos(angle) * 32 / (s.bodyDamage / 400 * 130);
					s.spdY -= Math.sin(angle) * 32 / (s.bodyDamage / 400 * 130);
				} else {
					//s.spdX -= Math.cos(angle) * 20 / radius;
					//s.spdY -= Math.sin(angle) * 20 / radius;
				}
				s.needToUpdate = true;
				if (typeof s !== "Player")
					s.dirChange = true;

				if(typeof s === "Player") s.updateHp = true;
				s.attacked = true;
				s.hp -= self.hp / 1;
				var penetration = Player.list[self.parent].penetration;
				self.hp -= s.maxhp * (1 - penetration / 100) / 2;
				if (self.hp <= 0 || isNaN(self.hp)){
					self.toRemove = true;
				}
				if (s.hp < 0 && !s.toRemove) { // prevent double points
					s.toRemove = true;
					var shooter = Player.list[self.parent];
					if (shooter) {
						shooter.score += s.score;
						shooter.newScore = true;
						shooter.updateScore = true;
					}
					if (s.type == "Player"){
						messages = Player.list[self.parent].name + " 杀死了 " + s.name + "!";
						s.deathReset();
					}
				}
				if (Player.list[self.parent] !== undefined && self.hp > 0
						&& Player.list[self.parent].tankType == 22) {
					for (var i = 0; i <= 720; i += 360 / Math.round(Math
							.random() * 2)) {
						var b1 = Bullet(self.parent, self.angle + i, Math
								.floor(self.hp / 10), self.speed);
						var angle = Math.atan2(self.y - s.y, self.x - s.x);
						b1.x = self.x;
						b1.y = self.y;
					}
				}
			} else
				s.angle = 0;
		}
	}
	self.getInitPack = function() {

		var pack = {
			id : self.id,
			x : self.x,
			y : self.y,
			angle : self.angle,
			speed : self.speed,
		};

<<<<<<< HEAD
=======
		if(self.type != 0) pack.type = self.type;

		return pack;

>>>>>>> 91fab3a9fdb1f32bcaa99edb80bfe198609314fe
	}
	self.getUpdatePack = function() {
		var pack = {
			id : self.id,
			x : self.x,
			y : self.y,
		};
		if (self.chaser || self.drone)
			pack.angle = self.angle;
		return pack;
	}

	Bullet.list[self.id] = self;
	initPack.bullet.push(self.getInitPack());
	return self;
}
Bullet.list = {};

Bullet.updatePack = {};

Bullet.regUpdate = function() {
	for ( var i in Bullet.list) {
		var bullet = Bullet.list[i];
		if (bullet.toRemove) {
			delete Bullet.list[i];
			removePack.bullet.push(bullet.id);
		} else {
			bullet.update();
			Bullet.updatePack[bullet.id] = bullet.getUpdatePack();
		}
	}
}

Bullet.update = function(player) {
	var pack = [];
	for ( var i in Bullet.list) {
		var bullet = Bullet.list[i];

		// the e e "objInViewOfPlayer" method checks iff the bullet can  be seen by the player every frame
		// if the player can, then the bullet's information will be sent to the player
		if (bullet !== undefined && objInViewOfPlayer(bullet, player)) {
			pack.push(Bullet.updatePack[bullet.id]);
		}
	}
	return pack;
}

Bullet.getAllInitPack = function() {
	var bullets = [];
	for ( var i in Bullet.list)
		bullets.push(Bullet.list[i].getInitPack());
	return bullets;
}

var DEBUG = true;

var isValidPassword = function(data, cb) {

	cb(true);
}
var isUsernameTaken = function(data, cb) {

	cb(false);
}
var addUser = function(data, cb) {
	cb();
}

var unnamed_usernames = [ '张三', '李四', '王五', '陆二', '赵六', '孙七', '小明', '小王', ];

var io = require('socket.io')(serv, {});
io.sockets.on('connection', function(socket) {
	socket.id = parseFloat(Math.random().toFixed(6));
	SOCKET_LIST[socket.id] = socket;

	socket.on('signIn', function(data) {
		isValidPassword(data, function(res) {
			if (res) {
				if (data.username == "")
					data.username = unnamed_usernames[Math.floor(Math.random()
							* unnamed_usernames.length)];
				Player.onConnect(socket, data.username);
				socket.emit('signInResponse', {
					success : true
				});
			} else {
				socket.emit('signInResponse', {
					success : false
				});
			}
		});
	});
	socket.on('signUp', function(data) {
		isUsernameTaken(data, function(res) {
			if (res) {
				socket.emit('signUpResponse', {
					success : false
				});
			} else {
				addUser(data, function() {
					socket.emit('signUpResponse', {
						success : true
					});
				});
			}
		});
	});

	socket.on('disconnect', function() {
		delete SOCKET_LIST[socket.id];
		Player.onDisconnect(socket);
	});
	socket.on('sendMsgToServer', function(data) {
		var playerName = Player.list[socket.id].name;
		for ( var i in SOCKET_LIST) {
			SOCKET_LIST[i].emit('addToChat', playerName + ': ' + data);
		}
	});

	socket.on('evalServer', function(data) {
		if (!DEBUG)
			return;
		var res = eval(data);
		socket.emit('evalAnswer', res);
	});

	socket.on('dimension', function(data) {
		WIDTH = data.width;
		HEIGHT = data.height;
	});

	socket.on('changeType', function(data) {
		var p = Player.list[socket.id];
		if(p !== undefined){
			if (p.availableUpgrades[0] == 1)
				p.availableUpgrades[0] = 0;
			if (p.availableUpgrades[1] == 1)
				p.availableUpgrades[1] = 0;
			if (p.availableUpgrades[2] == 1)
				p.availableUpgrades[2] = 0;
			var i = Player.tankProps[data.type.type];
			upgradeNewTank(p, i, data.type.type);
		}
	});

	var upgradeNewTank = function(p, i, t) {
		for ( var a in p.bullets) {
			p.bullets[a].toRemove = true;
		}
		p.tankType = t;
		p.updateTankType = true;
		p.minRegen = i.minRegen;
		p.maxRegen = i.maxRegen;
		p.minSpeed = i.minSpeed;
		p.maxSpeed = i.maxSpeed;
		p.minHp = i.minHp;
		p.maxHp = i.maxHp;
		p.minBulletHp = i.minBulletHp;
		p.maxBulletHp = i.maxBulletHp;
		p.minBulletSpeed = i.minBulletSpeed;
		p.maxBulletSpeed = i.maxBulletSpeed;
		p.minReload = i.minReload;
		p.maxReload = i.maxReload;
		p.minBodyDamage = i.minBodyDamage;
		p.maxBodyDamage = i.maxBodyDamage;
		p.minPenetration = i.minPenetration;
		p.maxPenetration = i.maxPenetration;

		var oldHpMax = p.hpMax;
		p.regen = (p.maxRegen - p.minRegen) / levelUpCount
				* (levelUpCount - p.regenCount) + p.minRegen;
		p.hpMax = (p.maxHp - p.minHp) / levelUpCount * p.hpMaxCount + p.minHp;

		p.hp = p.hpMax * (p.hp / oldHpMax);

		p.updateHpMax = true;
		p.bulletHp = (p.maxBulletHp - p.minBulletHp) / levelUpCount
				* p.bulletHpCount + p.minBulletHp;
		p.bulletSpeed = (p.maxBulletSpeed - p.minBulletSpeed) / levelUpCount
				* p.bulletSpeedCount + p.minBulletSpeed;
		p.reload = (p.maxReload - p.minReload) / levelUpCount
				* (levelUpCount - p.reloadCount) + p.minReload;
		p.maxSpd = (p.maxBulletSpeed - p.minBulletSpeed) / levelUpCount
				* p.maxSpdCount + p.minBulletSpeed;
		p.bodyDamage = (p.maxBodyDamage - p.minBodyDamage) / levelUpCount
				* p.bodyDamageCount + p.minBodyDamage;
		p.penetration = (p.maxPenetration - p.minPenetration) / levelUpCount
				* p.penetrationCount + p.minPenetration;
	}
	var levelUpCount = 8;
	socket.on('regen', function() {
		var p = Player.list[socket.id];
		updateLevel(p.maxRegen, p.minRegen, levelUpCount - p.regenCount,
				p.regenCount, 0);
		p.updateRegen = true;
	});

	socket.on('maxhealth', function() {
		var p = Player.list[socket.id];
		var oldHpMax = p.hpMax;
		updateLevel(p.maxHp, p.minHp, p.hpMaxCount, p.hpMaxCount, 1);
		// special :)
		p.hp = p.hpMax * (p.hp / oldHpMax);
		p.updateHpMax = true;
		p.updateHp = true;
	});

	socket.on('bulletspeed', function() {
		var p = Player.list[socket.id];
		updateLevel(p.maxBulletSpeed, p.minBulletSpeed, p.bulletSpeedCount,
				p.bulletSpeedCount, 2);
		p.updateBulletSpeed = true;
	});

	socket.on('bulletHp', function() {
		var p = Player.list[socket.id];
		updateLevel(p.maxBulletHp, p.minBulletHp, p.bulletHpCount,
				p.bulletHpCount, 3);
		p.updateBulletHp = true;
	});

	socket.on('reload', function() {
		var p = Player.list[socket.id];
		updateLevel(p.maxReload, p.minReload, levelUpCount - p.reloadCount,
				p.reloadCount, 4);
		p.updateReload = true;
	});

	socket.on('maxSpd', function() {
		var p = Player.list[socket.id];
		updateLevel(p.maxSpeed, p.minSpeed, p.maxSpdCount, p.maxSpdCount, 5);
		p.updateSpeed = true;
	});

	socket.on('bodyDamage', function() {
		var p = Player.list[socket.id];
		updateLevel(p.maxBodyDamage, p.minBodyDamage, p.bodyDamageCount,
				p.bodyDamageCount, 6);
		p.updateBodyDamage = true;
	});

	socket.on('penetration', function() {
		var p = Player.list[socket.id];
		updateLevel(p.maxPenetration, p.minPenetration, p.penetrationCount,
				p.penetrationCount, 7);
		p.updatePenetration = true;
	});

	var updateLevel = function(max, min, count1, count2, index) {
		var p = Player.list[socket.id];

		if (index == 4 || index == 0)
			var newValue = (max - min) / levelUpCount * (count1 - 1) + min;
		else
			var newValue = (max - min) / levelUpCount * (count1 + 1) + min;
		if (count2 < levelUpCount) {
			if (p.upgrades > 0) {
				p.upgrades--;
				p.updateUpgrades = true;

				switch (index) {
				case 0:
					p.regen = newValue;
					p.regenCount++;
					break;
				case 1:
					p.hpMax = newValue;
					p.hpMaxCount++;
					break;
				case 2:
					p.bulletSpeed = newValue;
					p.bulletSpeedCount++;
					break;
				case 3:
					p.bulletHp = newValue;
					p.bulletHpCount++;
					break;
				case 4:
					p.reload = newValue;
					p.reloadCount++;
					break;
				case 5:
					p.maxSpd = newValue;
					p.maxSpdCount++;
					break;
				case 6:
					p.bodyDamage = newValue;
					p.bodyDamageCount++;
					break;
				case 7:
					p.penetration = newValue;
					p.penetrationCount++;
					break;
				}
			}
		}
	}

});

var initPack = {
	player : [],
	bullet : [],
	square : [],
	pentagon : [],
	triangle : []
};
var removePack = {
	player : [],
	bullet : [],
	square : [],
	pentagon : [],
	triangle : []
};
var allpack = {};
var c = 0;

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};
var fps = 0;
var lastFpsTick = 0;
var tick = 0;
setInterval(function() {
	Triangle.regUpdate();
	Square.regUpdate();
	Pentagon.regUpdate();
	Player.regUpdate();
	Bullet.regUpdate();
	if(playerFirst){
		Player.initSectors();
	}

	var pack = {

	};
<<<<<<< HEAD

	if (!(initPack.player.length == 0 && initPack.bullet.length == 0
			&& initPack.square.length == 0
			&& initPack.pentagon.length == 0
			&& initPack.triangle.length == 0)) {
=======
	/*if(c % 20 == 0){
		messages = "Test " + c * Math.random() * 100;
	} test messages notification */
	if(messages != ""){
		allpack["msg"] = messages;
		messages = "";
	}
	for(var attrname in initPack){
		var val = initPack[attrname];
		if(initPack.hasOwnProperty(attrname) && Array.isArray(val) && val.length == 0){
			delete initPack[attrname];
		}
	}
	if (!(Object.keys(initPack).length === 0 && initPack.constructor === Object)) {
>>>>>>> 91fab3a9fdb1f32bcaa99edb80bfe198609314fe
		allpack["init"] = initPack;
	}
	if (!(removePack.player.length == 0 && removePack.bullet.length == 0
			&& removePack.square.length == 0
			&& removePack.pentagon.length == 0
			&& removePack.triangle.length == 0)) {
		allpack["remove"] = removePack;
	}
	for ( var i in SOCKET_LIST) {
		var socket = SOCKET_LIST[i];
		var player = Player.list[socket.id];

		if (c % 2 == 0 && player !== undefined) {
			var packSquare = Square.update(player);
			var packTriangle = Triangle.update(player);
			var packPentagon = Pentagon.update(player);
			var sizeS = Object.size(packSquare);
			var sizeT = Object.size(packTriangle);
			var sizeP = Object.size(packPentagon);
			if(sizeS > 0) pack.square = packSquare;
			if(sizeT > 0) pack.triangle = packTriangle;
			if(sizeP > 0) pack.pentagon = packPentagon;

			pack.player = Player.update(player);
		}
		var size = Object.size(pack);
		if(size != 0) allpack["update"] = pack;

<<<<<<< HEAD
		if(Object.size(allpack) != 0)
=======
		if(Object.size(allpack) != 0){
>>>>>>> 91fab3a9fdb1f32bcaa99edb80bfe198609314fe
			socket.emit('allUpdate', allpack);
		}
	}
	c++;

	for ( var member in allpack)
		delete allpack[member];
	initPack.player = [];
	initPack.bullet = [];
	initPack.square = [];
	initPack.pentagon = [];
	initPack.triangle = [];
	removePack.player = [];
	removePack.bullet = [];
	removePack.square = [];
	removePack.pentagon = [];
	removePack.triangle = [];
<<<<<<< HEAD
}, 1000 / 45);
=======

	tick = new Date().getTime();
    fps = tick - lastFpsTick;
    lastFpsTick = tick;
    console.log(fps);
}, 1000 / 25);
// approximately 45 times per second
//
>>>>>>> 91fab3a9fdb1f32bcaa99edb80bfe198609314fe
