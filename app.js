//var mongojs = require("mongojs");
//var db = mongojs('localhost:27017/myGame', ['account','progress']);

var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(process.env.PORT || 2000, '0.0.0.0');
console.log("Server started.");

var SOCKET_LIST = {};

var WIDTH = 0;
var HEIGHT = 0;

var GAME_DIMENSION = 5000;
//var GAME_HEIGHT = 5000;

var Entity = function(){
	var self = {
		x:-1000,
		y:-1000,
		spdX:0,
		spdY:0,
		id:"",
	}
	self.update = function(){
		self.updatePosition();
	}
	self.updatePosition = function(){
		if(self.x + self.spdX < GAME_DIMENSION && self.x + self.spdX > 0){
			self.x += self.spdX;
		}
		if(self.y + self.spdY < GAME_DIMENSION && self.y + self.spdY > 0){
			self.y += self.spdY;
		}
	}
	self.getDistance = function(pt){
		return Math.sqrt(Math.pow(self.x-pt.x,2) + Math.pow(self.y-pt.y,2));
	}
	return self;
}

var Player = function(id, name){
	var self = Entity();
	
	self.tankType = 0;
	self.reloadNum = 0;
	// twin : 1
	
	self.id = id;
	self.name = name;
	self.x = 2500;//Math.random() * GAME_DIMENSION;
	self.y = 2500;//Math.random() * GAME_DIMENSION;
	self.number = "" + Math.floor(10 * Math.random());
	self.pressingRight = false;
	self.pressingLeft = false;
	self.pressingUp = false;
	self.pressingDown = false;
	self.pressingAttack = false;
	self.mouseAngle = 0;
	self.upgrades = 0;
	
	self.hp = 100;
	
	self.score = 0;
	
	self.timer = 0;
	
	self.regen = 21;
	self.hpMax = 100;
	self.bulletHp = 1600;
	self.bulletSpeed = 7;
	self.reload = 38;
	self.maxSpd = 6;
	self.bodyDamage = 10;
	
	self.minRegen = 8;
	self.maxRegen = 21;
	
	self.minHp = 100;
	self.maxHp = 200;
	
	self.minBulletHp = 7;
	self.maxBulletHp = 10;
	
	self.minBulletSpeed = 10;
	self.maxBulletSpeed = 25;
	
	self.minReload = 11;
	self.maxReload = 38;
	
	self.minSpeed = 6;
	self.maxSpeed = 10;
	
	self.minBodyDamage = 10;
	self.maxBodyDamage = 200;
	
	self.regenCount = 0;
	self.hpMaxCount = 0;
	self.bulletHpCount = 0;
	self.bulletSpeedCount = 0;
	self.reloadCount = 0;
	self.maxSpdCount = 0;
	self.bodyDamageCount = 0;
	
	self.bullets = [];
	self.moveTimer = 0;
	self.friction = 0.96;
	self.level = 1;
	self.mouseX = 0;
	self.mouseY = 0;
	
	self.availableUpgrades = [0,0,0];
	self.sent = [0,0,0];
	var super_update = self.update;
	self.evaluateNextLevelScore = function(x){
		x++;
		if(x == 2) return 10;
		else if(x == 3) return 25;
		else if(x == 4) return 65;
		else return 0.46*x*x*x-12*x*x+170*x-529;
	}
	self.update = function(){
		
		self.updateSpd();
		for(var i in Player.list){
			var p = Player.list[i];
			if(p.id != self.id){
				if(self.getDistance(p) < 40){
					p.hp -= Math.round(self.bodyDamage / 3) + 10;
					self.hp -= Math.round(p.bodyDamage / 3) + 10;
					console.log('bodyD: ' + self.bodyDamage + ', ' + p.bodyDamage);
					if(p.hp <= 0) p.deathReset();
					else if(self.hp <= 0) p.deathReset();
				}
			}
		}
		
		//self.regen();
		
		//console.log(self.reload);
		//console.log(self.score + ', ' + self.lastScore + ', ' + self.upgrades);
		if(self.score >= self.evaluateNextLevelScore(self.level)){
			var maxUps = 0;
			for(var i = 0; i < 45; i++){
				if(self.score >= self.evaluateNextLevelScore(self.level+i)){
					maxUps++;
				}else break;
			}
			self.upgrades+=maxUps;
			self.level+=maxUps;
		}
		self.checkForUpgrades();
		//console.log(self.regen);
		if(self.timer % Math.round(self.regen) == 0){
			if(self.hp < self.hpMax){
				self.hp ++;
				//console.log('here');
			}
			
			//console.log(Object.keys(Triangle.list).length);
		}
		super_update();
		self.timer++;
		//console.log(self.reload);
		if(self.pressingAttack && self.timer % Math.round(self.reload) == 0){
			self.shootBullet(self.mouseAngle,self.mouseX,self.mouseY);
		}
		if(self.tankType == 7 || self.tankType == 15){
			if(self.bullets.length != 0){
				for(var i in self.bullets){
					var bullet = self.bullets[i];
					if(typeof bullet == undefined) continue;
					if(bullet.toRemove) self.bullets.splice(i, 1);
					var bulletX = bullet.x - self.x + WIDTH/2;
					var bulletY = bullet.y - self.y + HEIGHT/2;
					
					bullet.angle = Math.atan2((self.mouseY+HEIGHT/2)-bulletY, (self.mouseX+WIDTH/2)-bulletX) * 180 / Math.PI;
					
					//console.log(bulletX + ',' + bulletY + ';' + self.mouseX + ',' + self.mouseY);
					var distance = Math.sqrt(Math.pow(self.mouseX-bulletX,2) + Math.pow(self.mouseY-bulletY,2));
					//console.log(distance);
					if(Math.sqrt(Math.pow(self.mouseX+WIDTH/2-bulletX,2) + Math.pow(self.mouseY+HEIGHT/2-bulletY,2)) < 25){
						bullet.stationary = true;
						bullet.friction = 0.80;
					}else{
						bullet.stationary = false;
						bullet.friction = 1;
					}
				}
				
			}
			
		}
	}
	self.checkForUpgrades = function(){
		var tanks = [];
		if((self.level >= 15 && !self.sent[0]) ||
			(self.level >= 30 && !self.sent[1]) ||
			(self.level >= 45 && !self.sent[2])){
			console.log(self.level + ', ' + self.availableUpgrades[0]);
			if(self.level >= 45 && !self.availableUpgrades[2])
				self.availableUpgrades[2] = true;
			else if(self.level >= 30 && !self.availableUpgrades[1])
				self.availableUpgrades[1] = true;
			else if(self.level >= 15 && !self.availableUpgrades[0])
				self.availableUpgrades[0] = true;
			
			if(self.level >= 45 && self.availableUpgrades[2]){
				if(self.tankType == 8){
					tanks = [3, 4, 9];
				}else if(self.tankType == 13){
					tanks = [3, 4, 9];
				}else if(self.tankType == 14){
					tanks = [2, 21];
				}else if(self.tankType == 5){
					tanks = [6];
				}else if(self.tankType == 7){
					tanks = [15];
				}else if(self.tankType == 16){
					tanks = [19, 20];
				}else if(self.tankType == 17){
					tanks = [18];
				}
				SOCKET_LIST[self.id].emit('newTanks', {tanks:tanks});
				self.sent[2] = true;
			}else if(self.level >= 30 && self.availableUpgrades[1]){
				if(self.tankType == 1){
					tanks = [8, 13, 14];
				}else if(self.tankType == 10){
					//console.log('hereererererereer');
					tanks = [5, 8, 13];
				}else if(self.tankType == 11){
					tanks = [16, 17];
				}else if(self.tankType == 12){
					tanks = [7, 22];
				}
				SOCKET_LIST[self.id].emit('newTanks', {tanks:tanks});
				self.sent[1] = true;
			}else if(self.level >= 15 && self.availableUpgrades[0]){
				tanks = [1, 10, 11, 12];
				console.log('wherer');
				SOCKET_LIST[self.id].emit('newTanks', {tanks:tanks});
				self.sent[0] = true;
			}
		}
		
	}
	self.shootBullet = function(angle, x, y){
		//backward kick
		
		//console.log('shoot');
		var turbAngle = angle + 6 * Math.random() - 6;
		angle += 6 * Math.random() - 6;
		var damping = 0.4;
		if(self.tankType === 0){
			self.spdX -= Math.cos(angle/180*Math.PI) * 0.5 * damping;
			self.spdY -= Math.sin(angle/180*Math.PI) * 0.5 * damping;
			var b = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
			b.x = self.x;
			b.y = self.y;
		} else if (self.tankType === 1) {
			
			turbAngle = -90 + turbAngle;
			if(self.reloadNum == 0){
				//console.log("0");
				self.spdX -= Math.cos(angle/180*Math.PI) * 0.5 * damping;
				self.spdY -= Math.sin(angle/180*Math.PI) * 0.5 * damping;
				var b1 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b1.x = self.x - Math.cos(turbAngle*Math.PI/180) * 17;
				b1.y = self.y - Math.sin(turbAngle*Math.PI/180) * 17;
				self.reloadNum = 1;
				//console.log("x: " + Math.sin(turbAngle*Math.PI/180));
			}else if(self.reloadNum == 1){
				self.spdX -= Math.cos(angle/180*Math.PI) * 0.5 * damping;
				self.spdY -= Math.sin(angle/180*Math.PI) * 0.5 * damping;
				//console.log("1");
				var b2 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b2.x = self.x + Math.cos(turbAngle*Math.PI/180)* 17;
				b2.y = self.y + Math.sin(turbAngle*Math.PI/180) * 17;
				self.reloadNum = 0;
			}
			//console.log(self.mouseAngle);
		} else if (self.tankType === 2) {
			turbAngle = -90 + turbAngle;
			if(self.reloadNum == 0){
				self.spdX -= Math.cos(angle/180*Math.PI) * 1 * damping;
				self.spdY -= Math.sin(angle/180*Math.PI) * 1 * damping;
				var b1 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b1.x = self.x - Math.cos(turbAngle*Math.PI/180) * 15;
				b1.y = self.y - Math.sin(turbAngle*Math.PI/180) * 15;
				var b2 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b2.x = self.x + Math.cos(turbAngle*Math.PI/180)* 20;
				b2.y = self.y + Math.sin(turbAngle*Math.PI/180) * 20;
				self.reloadNum = 1;
			}else if(self.reloadNum == 1){
				self.spdX -= Math.cos(angle/180*Math.PI) * 0.5 * damping;
				self.spdY -= Math.sin(angle/180*Math.PI) * 0.5 * damping;
				var b = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b.x = self.x;
				b.y = self.y;
				self.reloadNum = 0;
			}
		} else if (self.tankType === 3){
			if(self.reloadNum == 0){
				var b1 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b1.x = self.x; b1.y = self.y;
				var b2 = Bullet(self.id,angle - 2 * 360 / 8,self.bulletHp,self.bulletSpeed);
				b2.x = self.x; b2.y = self.y;
				var b3 = Bullet(self.id,angle - 4 * 360 / 8,self.bulletHp,self.bulletSpeed);
				b3.x = self.x; b3.y = self.y;
				var b4 = Bullet(self.id,angle - 6 * 360 / 8,self.bulletHp,self.bulletSpeed);
				b4.x = self.x; b4.y = self.y;
				self.reloadNum = 1;
			}else if(self.reloadNum == 1){
				var b1 = Bullet(self.id,angle - 1 * 360 / 8,self.bulletHp,self.bulletSpeed);
				b1.x = self.x; b1.y = self.y;
				var b2 = Bullet(self.id,angle - 3 * 360 / 8,self.bulletHp,self.bulletSpeed);
				b2.x = self.x; b2.y = self.y;
				var b3 = Bullet(self.id,angle - 5 * 360 / 8,self.bulletHp,self.bulletSpeed);
				b3.x = self.x; b3.y = self.y;
				var b4 = Bullet(self.id,angle - 7 * 360 / 8,self.bulletHp,self.bulletSpeed);
				b4.x = self.x; b4.y = self.y;
				self.reloadNum = 0;
			}
		} else if (self.tankType === 4) {
			turbAngle = -90 + turbAngle;
			self.spdX += Math.cos(angle/180*Math.PI) * 1 * damping;
			self.spdY += Math.sin(angle/180*Math.PI) * 1 * damping;
			for(var i = 0; i < 360; i += 120){
				angle += 120;
				turbAngle += 120;
				if(self.reloadNum == 0){
					var b1 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
					b1.x = self.x - Math.cos(turbAngle*Math.PI/180) * 17;
					b1.y = self.y - Math.sin(turbAngle*Math.PI/180) * 17;
					
				}else if(self.reloadNum == 1){
					var b2 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
					b2.x = self.x + Math.cos(turbAngle*Math.PI/180)* 17;
					b2.y = self.y + Math.sin(turbAngle*Math.PI/180) * 17;
				}
			}
			if(self.reloadNum == 0){
				self.reloadNum = 1;
			}else self.reloadNum = 0;
			//console.log(self.mouseAngle);
		} else if (self.tankType === 5) {
			turbAngle = -90 + turbAngle;
			self.spdX += Math.cos(angle/180*Math.PI) * 1.5 * damping;
			self.spdY += Math.sin(angle/180*Math.PI) * 1.5 * damping;
			var b1 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
			b1.x = self.x;
			b1.y = self.y;
			
			angle += 150;
			var b2 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
			b2.x = self.x;
			b2.y = self.y;
			
			angle -= 150 * 2;
			var b2 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
			b2.x = self.x;
			b2.y = self.y;
		} else if (self.tankType === 6) {
			turbAngle = -90 + turbAngle;
			self.spdX += Math.cos(angle/180*Math.PI) * 2.5 * damping;
			self.spdY += Math.sin(angle/180*Math.PI) * 2.5 * damping;
			var b1 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
			b1.x = self.x;
			b1.y = self.y;
			
			if(self.reloadNum == 0){
				angle += 150;
				var b2 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b2.x = self.x;
				b2.y = self.y;
				
				angle -= 300;
				var b3 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b3.x = self.x;
				b3.y = self.y;
				self.reloadNum = 1;
			} else if(self.reloadNum == 1){
				angle += 135;
				var b2 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b2.x = self.x;
				b2.y = self.y;
				
				angle -= 270;
				var b4 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b4.x = self.x;
				b4.y = self.y;
				self.reloadNum = 0;
			}
		} else if (self.tankType === 7) {
			//console.log(self.bullets.length);
			if(self.bullets.length < 13){
				var b = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed / 2,true);
				b.x = self.x;
				b.y = self.y;
				self.bullets.push(b);
			}
		} else if (self.tankType === 8) {
			turbAngle = -90 + turbAngle;
			//self.spdX += Math.cos(angle/180*Math.PI) * 1;
			//self.spdY += Math.sin(angle/180*Math.PI) * 1;
			for(var i = 0; i < 360; i += 180){
				angle += 180;
				turbAngle += 180;
				if(self.reloadNum == 0){
					var b1 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
					b1.x = self.x - Math.cos(turbAngle*Math.PI/180) * 17;
					b1.y = self.y - Math.sin(turbAngle*Math.PI/180) * 17;
					
				}else if(self.reloadNum == 1){
					var b2 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
					b2.x = self.x + Math.cos(turbAngle*Math.PI/180)* 17;
					b2.y = self.y + Math.sin(turbAngle*Math.PI/180) * 17;
				}
			}
			if(self.reloadNum == 0){
				self.reloadNum = 1;
			}else self.reloadNum = 0;
			//console.log(self.mouseAngle);
		} else if (self.tankType === 9){
			if(self.reloadNum == 0){
				var b1 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b1.x = self.x; b1.y = self.y;
				var b2 = Bullet(self.id,angle - 2 * 360 / 10,self.bulletHp,self.bulletSpeed);
				b2.x = self.x; b2.y = self.y;
				var b3 = Bullet(self.id,angle - 4 * 360 / 10,self.bulletHp,self.bulletSpeed);
				b3.x = self.x; b3.y = self.y;
				var b4 = Bullet(self.id,angle - 6 * 360 / 10,self.bulletHp,self.bulletSpeed);
				b4.x = self.x; b4.y = self.y;
				var b5 = Bullet(self.id,angle - 8 * 360 / 10,self.bulletHp,self.bulletSpeed);
				b5.x = self.x; b5.y = self.y;
				self.reloadNum = 1;
			}else if(self.reloadNum == 1){
				var b1 = Bullet(self.id,angle - 1 * 360 / 10,self.bulletHp,self.bulletSpeed);
				b1.x = self.x; b1.y = self.y;
				var b2 = Bullet(self.id,angle - 3 * 360 / 10,self.bulletHp,self.bulletSpeed);
				b2.x = self.x; b2.y = self.y;
				var b3 = Bullet(self.id,angle - 5 * 360 / 10,self.bulletHp,self.bulletSpeed);
				b3.x = self.x; b3.y = self.y;
				var b4 = Bullet(self.id,angle - 7 * 360 / 10,self.bulletHp,self.bulletSpeed);
				b4.x = self.x; b4.y = self.y;
				var b5 = Bullet(self.id,angle - 9 * 360 / 10,self.bulletHp,self.bulletSpeed);
				b5.x = self.x; b5.y = self.y;
				self.reloadNum = 0;
			}
		} else if (self.tankType === 10){
			if(self.reloadNum == 0){
				self.spdX -= Math.cos(angle/180*Math.PI) * 0.5 * damping;
				self.spdY -= Math.sin(angle/180*Math.PI) * 0.5 * damping;
				var b1 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b1.x = self.x; b1.y = self.y;
				self.reloadNum = 1;
			}else if(self.reloadNum == 1){
				self.spdX += Math.cos(angle/180*Math.PI) * 0.5 * damping;
				self.spdY += Math.sin(angle/180*Math.PI) * 0.5 * damping;
				var b1 = Bullet(self.id,angle - 180,self.bulletHp,self.bulletSpeed);
				b1.x = self.x; b1.y = self.y;
				self.reloadNum = 0;
			}
		} else if (self.tankType === 11){
			self.spdX -= Math.cos(angle/180*Math.PI) * 0.5 * damping;
			self.spdY -= Math.sin(angle/180*Math.PI) * 0.5 * damping;
			var b = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
			b.x = self.x;
			b.y = self.y;
		} else if (self.tankType === 12){
			self.spdX -= Math.cos(angle/180*Math.PI) * 0.5 * damping;
			self.spdY -= Math.sin(angle/180*Math.PI) * 0.5 * damping;
			var b = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
			b.x = self.x;
			b.y = self.y;
		}else if (self.tankType === 13){
			if(self.reloadNum == 0){
				var b1 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b1.x = self.x; b1.y = self.y;
				var b2 = Bullet(self.id,angle - 2 * 360 / 4,self.bulletHp,self.bulletSpeed);
				b2.x = self.x; b2.y = self.y;
				self.reloadNum = 1;
			}else if(self.reloadNum == 1){
				var b1 = Bullet(self.id,angle - 1 * 360 / 4,self.bulletHp,self.bulletSpeed);
				b1.x = self.x; b1.y = self.y;
				var b2 = Bullet(self.id,angle - 3 * 360 / 4,self.bulletHp,self.bulletSpeed);
				b2.x = self.x; b2.y = self.y;
				self.reloadNum = 0;
			}
		} else if (self.tankType === 14){
			self.spdX -= Math.cos(angle/180*Math.PI) * 2 * damping;
			self.spdY -= Math.sin(angle/180*Math.PI) * 2 * damping;
			var b1 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
			b1.x = self.x; b1.y = self.y;
			var b2 = Bullet(self.id,angle - 1 * 360 / 9,self.bulletHp,self.bulletSpeed);
			b2.x = self.x; b2.y = self.y;
			var b3 = Bullet(self.id,angle + 1 * 360 / 9,self.bulletHp,self.bulletSpeed);
			b3.x = self.x; b3.y = self.y;
		} else if (self.tankType === 15) {
			//console.log(self.bullets.length);
			if(self.bullets.length < 20){
				var b = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed / 2,true);
				b.x = self.x;
				b.y = self.y;
				self.bullets.push(b);
			}
		} else if (self.tankType === 16) {
			self.spdX -= Math.cos(angle/180*Math.PI) * 3 * damping;
			self.spdY -= Math.sin(angle/180*Math.PI) * 3 * damping;
			var b1 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
			b1.x = self.x - Math.cos(turbAngle*Math.PI/180) * 17;
			b1.y = self.y - Math.sin(turbAngle*Math.PI/180) * 17;
		} else if (self.tankType === 17) {
			
			turbAngle = -90 + turbAngle;
			if(self.reloadNum == 0){
				//console.log("0");
				self.spdX -= Math.cos(angle/180*Math.PI) * 0.5 * damping;
				self.spdY -= Math.sin(angle/180*Math.PI) * 0.5 * damping;
				var b1 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b1.x = self.x - Math.cos(turbAngle*Math.PI/180) * 10;
				b1.y = self.y - Math.sin(turbAngle*Math.PI/180) * 10;
				
				var b2 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b2.x = self.x + Math.cos(turbAngle*Math.PI/180)* 10;
				b2.y = self.y + Math.sin(turbAngle*Math.PI/180) * 10;
				self.reloadNum = 1;
				//console.log("x: " + Math.sin(turbAngle*Math.PI/180));
			}else if(self.reloadNum == 1){
				self.spdX -= Math.cos(angle/180*Math.PI) * 0.5 * damping;
				self.spdY -= Math.sin(angle/180*Math.PI) * 0.5 * damping;
				var b1 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b1.x = self.x - Math.cos(turbAngle*Math.PI/180) * 20;
				b1.y = self.y - Math.sin(turbAngle*Math.PI/180) * 20;
				
				var b2 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b2.x = self.x + Math.cos(turbAngle*Math.PI/180)* 20;
				b2.y = self.y + Math.sin(turbAngle*Math.PI/180) * 20;
				self.reloadNum = 0;
			}
			//console.log(self.mouseAngle);
		} else if (self.tankType === 18) {
			
			turbAngle = -90 + turbAngle;
			if(self.reloadNum == 0){
				//console.log("0");
				self.spdX -= Math.cos(angle/180*Math.PI) * 0.5 * damping;
				self.spdY -= Math.sin(angle/180*Math.PI) * 0.5 * damping;
				var b1 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b1.x = self.x - Math.cos(turbAngle*Math.PI/180) * 7;
				b1.y = self.y - Math.sin(turbAngle*Math.PI/180) * 7;
				
				var b2 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b2.x = self.x + Math.cos(turbAngle*Math.PI/180) * 7;
				b2.y = self.y + Math.sin(turbAngle*Math.PI/180) * 7;
				self.reloadNum = 1;
				//console.log("x: " + Math.sin(turbAngle*Math.PI/180));
			}else if(self.reloadNum == 1){
				self.spdX -= Math.cos(angle/180*Math.PI) * 0.5 * damping;
				self.spdY -= Math.sin(angle/180*Math.PI) * 0.5 * damping;
				var b1 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b1.x = self.x - Math.cos(turbAngle*Math.PI/180) * 14;
				b1.y = self.y - Math.sin(turbAngle*Math.PI/180) * 14;
				
				var b2 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b2.x = self.x + Math.cos(turbAngle*Math.PI/180) * 14;
				b2.y = self.y + Math.sin(turbAngle*Math.PI/180) * 14;
				self.reloadNum = 2;
			}else if(self.reloadNum == 2){
				self.spdX -= Math.cos(angle/180*Math.PI) * 0.5 * damping;
				self.spdY -= Math.sin(angle/180*Math.PI) * 0.5 * damping;
				var b1 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b1.x = self.x - Math.cos(turbAngle*Math.PI/180) * 21;
				b1.y = self.y - Math.sin(turbAngle*Math.PI/180) * 21;
				
				var b2 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b2.x = self.x + Math.cos(turbAngle*Math.PI/180) * 21;
				b2.y = self.y + Math.sin(turbAngle*Math.PI/180) * 21;
				self.reloadNum = 0;
			}
			//console.log(self.mouseAngle);
		} else if (self.tankType === 19) {
			if(self.reloadNum == 0){
				self.spdX -= Math.cos(angle/180*Math.PI) * 3 * damping;
				self.spdY -= Math.sin(angle/180*Math.PI) * 3 * damping;
				var b1 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b1.x = self.x - Math.cos(turbAngle*Math.PI/180) * 17;
				b1.y = self.y - Math.sin(turbAngle*Math.PI/180) * 17;
				self.reloadNum = 1;
			}else if(self.reloadNum == 1){
				self.spdX -= Math.cos((angle+180)/180*Math.PI) * 3 * damping;
				self.spdY -= Math.sin((angle+180)/180*Math.PI) * 3 * damping;
				var b1 = Bullet(self.id,angle+180,self.bulletHp,self.bulletSpeed);
				b1.x = self.x - Math.cos((turbAngle+180)*Math.PI/180) * 17;
				b1.y = self.y - Math.sin((turbAngle+180)*Math.PI/180) * 17;
				self.reloadNum = 0;
			}
		} else if (self.tankType === 20) {
			
			self.spdX -= Math.cos(angle/180*Math.PI) * 3 * damping;
			self.spdY -= Math.sin(angle/180*Math.PI) * 3 * damping;
			
			angle -= 8;
			turbAngle -= 8;
			var b1 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
			b1.x = self.x - Math.cos(turbAngle*Math.PI/180) * 17;
			b1.y = self.y - Math.sin(turbAngle*Math.PI/180) * 17;
			
			angle += 8;
			turbAngle += 8;
			var b2 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
			b2.x = self.x - Math.cos(turbAngle*Math.PI/180) * 17;
			b2.y = self.y - Math.sin(turbAngle*Math.PI/180) * 17;
		} else if (self.tankType === 21){
			self.spdX -= Math.cos(angle/180*Math.PI) * 1.5 * damping;
			self.spdY -= Math.sin(angle/180*Math.PI) * 1.5 * damping;
			if(self.reloadNum == 0){
				var b1 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b1.x = self.x; b1.y = self.y;
				var b2 = Bullet(self.id,angle - 1 * 360 / 9,self.bulletHp,self.bulletSpeed);
				b2.x = self.x; b2.y = self.y;
				var b3 = Bullet(self.id,angle + 1 * 360 / 9,self.bulletHp,self.bulletSpeed);
				b3.x = self.x; b3.y = self.y;
				self.reloadNum = 1;
			}else if(self.reloadNum == 1){
				var b1 = Bullet(self.id,angle + 1 * 360 / 18,self.bulletHp,self.bulletSpeed);
				b1.x = self.x; b1.y = self.y;
				var b2 = Bullet(self.id,angle - 1 * 360 / 18,self.bulletHp,self.bulletSpeed);
				b2.x = self.x; b2.y = self.y;
				self.reloadNum = 0;
			}
		} else if(self.tankType === 22){
			self.spdX -= Math.cos(angle/180*Math.PI) * 0.5 * damping;
			self.spdY -= Math.sin(angle/180*Math.PI) * 0.5 * damping;
			var b = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
			b.x = self.x;
			b.y = self.y;
			console.log('shot');
		}

	}
	self.deathReset = function(){
		self.hp = self.hpMax;
		self.x = Math.random() * GAME_DIMENSION;
		self.y = Math.random() * GAME_DIMENSION;
		/*
		self.regenCount = 0;
		self.hpMaxCount = 0;
		self.bulletHpCount = 0;
		self.bulletSpeedCount = 0;
		self.reloadCount = 0;
		self.maxSpdCount = 0;
		self.bodyDamageCount = 0;
		*/
	}
	self.regdden = function(){
		if(self.timer % self.regen == 0){
			if(self.hp < self.hpMax)
				self.hp ++;
		}
	}
	var smoothMvmtTimer = 0;
	self.updateSpd = function(){
		if(self.pressingRight && self.x < GAME_DIMENSION){
			if(self.spdX < self.maxSpd) self.spdX++;
		}
		else if(self.pressingLeft && self.x > 0){
			if(self.spdX > -self.maxSpd) self.spdX--;
		}
		
		if(self.pressingUp && self.y > 0){
			if(self.spdY > -self.maxSpd) self.spdY--;
		}
		else if(self.pressingDown && self.y < GAME_DIMENSION){
			if(self.spdY < self.maxSpd) self.spdY++;
		}
		
		self.spdX *= self.friction;
		self.spdY *= self.friction;
	}
	
	self.getInitPack = function(){
		return {
			id:self.id,
			x:self.x,
			y:self.y,	
			number:self.number,	
			hp:self.hp,
			hpMax:self.hpMax,
			score:self.score,
			name:self.name,
			tankType:self.tankType,
		};		
	}
	self.getUpdatePack = function(){
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			hp:self.hp,
			maxhp:self.hpMaxCount,
			pMaxHp:self.hpMax,
			bulletSpeed:self.bulletSpeedCount,
			bulletHp:self.bulletHpCount,
			bulletReload:self.reloadCount,
			movementSpeed:self.maxSpdCount,
			bodyDamage:self.bodyDamageCount,
			regen:self.regenCount,
			score:self.score,
			angle:self.mouseAngle,
			upgrades:self.upgrades,
			tankType:self.tankType,
			level:self.level,
		}	
	}
	
	Player.list[id] = self;
	
	initPack.player.push(self.getInitPack());
	return self;
}
Player.list = {};
Player.tankProps = [
	{ name: 'base tank', minRegen: 8, maxRegen: 21, minSpeed: 6, maxSpeed: 10, minHp: 100, maxHp: 200, 
	minBulletHp: 7, maxBulletHp: 30, minBulletSpeed: 7, maxBulletSpeed: 25, minReload: 11, maxReload: 38, 
	minBodyDamage: 10, maxBodyDamage: 200},
	{ name: 'twin', minRegen: 6, maxRegen: 21, minSpeed: 6, maxSpeed: 9, minHp: 100, maxHp: 160, 
	minBulletHp: 10, maxBulletHp: 50, minBulletSpeed: 5, maxBulletSpeed: 20, minReload: 3, maxReload: 21,
	minBodyDamage: 10, maxBodyDamage: 200},
	{ name: 'triplet', minRegen: 4, maxRegen: 21, minSpeed: 6, maxSpeed: 10, minHp: 100, maxHp: 170, 
	minBulletHp: 10, maxBulletHp: 55, minBulletSpeed: 5, maxBulletSpeed: 23, minReload: 3, maxReload: 21,
	minBodyDamage: 10, maxBodyDamage: 200},
	{ name: 'octotank', minRegen: 4, maxRegen: 21, minSpeed: 6, maxSpeed: 10, minHp: 100, maxHp: 180, 
	minBulletHp: 10, maxBulletHp: 40, minBulletSpeed: 15, maxBulletSpeed: 23, minReload: 4, maxReload: 21,
	minBodyDamage: 10, maxBodyDamage: 200},
	{ name: 'triple twin', minRegen: 4, maxRegen: 21, minSpeed: 6, maxSpeed: 10, minHp: 100, maxHp: 180, 
	minBulletHp: 10, maxBulletHp: 40, minBulletSpeed: 15, maxBulletSpeed: 23, minReload: 4, maxReload: 21,
	minBodyDamage: 10, maxBodyDamage: 200},
	{ name: 'triangle', minRegen: 4, maxRegen: 21, minSpeed: 6, maxSpeed: 10, minHp: 100, maxHp: 180, 
	minBulletHp: 10, maxBulletHp: 40, minBulletSpeed: 15, maxBulletSpeed: 23, minReload: 4, maxReload: 21,
	minBodyDamage: 80, maxBodyDamage: 280},
	{ name: 'booster', minRegen: 2, maxRegen: 17, minSpeed: 6, maxSpeed: 10, minHp: 100, maxHp: 180, 
	minBulletHp: 10, maxBulletHp: 40, minBulletSpeed: 15, maxBulletSpeed: 23, minReload: 4, maxReload: 21,
	minBodyDamage: 130, maxBodyDamage: 360},
	{ name: 'overseer', minRegen: 4, maxRegen: 21, minSpeed: 6, maxSpeed: 10, minHp: 100, maxHp: 180, 
	minBulletHp: 10, maxBulletHp: 80, minBulletSpeed: 15, maxBulletSpeed: 23, minReload: 4, maxReload: 21,
	minBodyDamage: 10, maxBodyDamage: 200},
	{ name: 'twin flank', minRegen: 4, maxRegen: 21, minSpeed: 6, maxSpeed: 10, minHp: 100, maxHp: 180, 
	minBulletHp: 10, maxBulletHp: 40, minBulletSpeed: 15, maxBulletSpeed: 23, minReload: 4, maxReload: 21,
	minBodyDamage: 10, maxBodyDamage: 200},
	{ name: 'decatank', minRegen: 4, maxRegen: 21, minSpeed: 6, maxSpeed: 10, minHp: 100, maxHp: 180, 
	minBulletHp: 10, maxBulletHp: 40, minBulletSpeed: 15, maxBulletSpeed: 23, minReload: 4, maxReload: 21,
	minBodyDamage: 10, maxBodyDamage: 200},
	{ name: 'flank guard', minRegen: 3, maxRegen: 18, minSpeed: 6, maxSpeed: 10, minHp: 100, maxHp: 180, 
	minBulletHp: 10, maxBulletHp: 40, minBulletSpeed: 15, maxBulletSpeed: 23, minReload: 4, maxReload: 21,
	minBodyDamage: 60, maxBodyDamage: 260},
	{ name: 'machine gun', minRegen: 4, maxRegen: 21, minSpeed: 6, maxSpeed: 10, minHp: 100, maxHp: 180, 
	minBulletHp: 10, maxBulletHp: 40, minBulletSpeed: 15, maxBulletSpeed: 23, minReload: 2, maxReload: 16,
	minBodyDamage: 10, maxBodyDamage: 200},
	{ name: 'sniper', minRegen: 4, maxRegen: 21, minSpeed: 8, maxSpeed: 12, minHp: 100, maxHp: 180, 
	minBulletHp: 10, maxBulletHp: 100, minBulletSpeed: 15, maxBulletSpeed: 23, minReload: 25, maxReload: 50,
	minBodyDamage: 10, maxBodyDamage: 200},
	{ name: 'quad tank', minRegen: 4, maxRegen: 21, minSpeed: 6, maxSpeed: 10, minHp: 100, maxHp: 180, 
	minBulletHp: 10, maxBulletHp: 40, minBulletSpeed: 15, maxBulletSpeed: 23, minReload: 4, maxReload: 21,
	minBodyDamage: 10, maxBodyDamage: 200},
	{ name: 'triple shot', minRegen: 4, maxRegen: 21, minSpeed: 6, maxSpeed: 10, minHp: 100, maxHp: 180, 
	minBulletHp: 10, maxBulletHp: 40, minBulletSpeed: 15, maxBulletSpeed: 23, minReload: 4, maxReload: 21,
	minBodyDamage: 10, maxBodyDamage: 200},
	{ name: 'overlord', minRegen: 4, maxRegen: 21, minSpeed: 6, maxSpeed: 10, minHp: 100, maxHp: 180, 
	minBulletHp: 10, maxBulletHp: 100, minBulletSpeed: 15, maxBulletSpeed: 23, minReload: 4, maxReload: 21,
	minBodyDamage: 10, maxBodyDamage: 200},
	{ name: 'destroyer', minRegen: 4, maxRegen: 21, minSpeed: 6, maxSpeed: 10, minHp: 150, maxHp: 300, 
	minBulletHp: 70, maxBulletHp: 270, minBulletSpeed: 8, maxBulletSpeed: 15, minReload: 30, maxReload: 80,
	minBodyDamage: 150, maxBodyDamage: 365},
	{ name: 'gunner', minRegen: 4, maxRegen: 21, minSpeed: 6, maxSpeed: 10, minHp: 100, maxHp: 180, 
	minBulletHp: 7, maxBulletHp: 30, minBulletSpeed: 19, maxBulletSpeed: 30, minReload: 3, maxReload: 18,
	minBodyDamage: 150, maxBodyDamage: 365},
	{ name: 'hexagunner', minRegen: 4, maxRegen: 21, minSpeed: 6, maxSpeed: 10, minHp: 100, maxHp: 180, 
	minBulletHp: 7, maxBulletHp: 32, minBulletSpeed: 19, maxBulletSpeed: 30, minReload: 2, maxReload: 16,
	minBodyDamage: 10, maxBodyDamage: 200},
	{ name: 'flank destroyer', minRegen: 4, maxRegen: 21, minSpeed: 6, maxSpeed: 10, minHp: 150, maxHp: 300, 
	minBulletHp: 70, maxBulletHp: 280, minBulletSpeed: 8, maxBulletSpeed: 15, minReload: 30, maxReload: 80,
	minBodyDamage: 150, maxBodyDamage: 369},
	{ name: 'twin destroyer', minRegen: 4, maxRegen: 21, minSpeed: 6, maxSpeed: 10, minHp: 150, maxHp: 300, 
	minBulletHp: 70, maxBulletHp: 280, minBulletSpeed: 8, maxBulletSpeed: 15, minReload: 30, maxReload: 80,
	minBodyDamage: 150, maxBodyDamage: 369},
	{ name: 'penta shot', minRegen: 4, maxRegen: 21, minSpeed: 6, maxSpeed: 10, minHp: 100, maxHp: 180, 
	minBulletHp: 10, maxBulletHp: 40, minBulletSpeed: 15, maxBulletSpeed: 23, minReload: 4, maxReload: 21,
	minBodyDamage: 10, maxBodyDamage: 200},
	{ name: 'flak cannon', minRegen: 4, maxRegen: 21, minSpeed: 6, maxSpeed: 10, minHp: 100, maxHp: 180, 
	minBulletHp: 10, maxBulletHp: 131, minBulletSpeed: 15, maxBulletSpeed: 23, minReload: 4, maxReload: 21,
	minBodyDamage: 10, maxBodyDamage: 200},
];
Player.onConnect = function(socket,username){
	var player = Player(socket.id,username);
	socket.on('keyPress',function(data){
		if(data.inputId === 'left')
			player.pressingLeft = data.state;
		else if(data.inputId === 'right')
			player.pressingRight = data.state;
		else if(data.inputId === 'up')
			player.pressingUp = data.state;
		else if(data.inputId === 'down')
			player.pressingDown = data.state;
		else if(data.inputId === 'attack'){
			player.pressingAttack = data.state;
		}
		else if(data.inputId === 'mouseAngle'){
			player.mouseAngle = data.state;
			player.mouseX = data.mouseX;
			player.mouseY = data.mouseY;
		}
	});
	
	socket.emit('init',{
		selfId:socket.id,
		player:Player.getAllInitPack(),
		bullet:Bullet.getAllInitPack(),
		square:Square.getAllInitPack(),
		pentagon:Pentagon.getAllInitPack(),
		triangle:Triangle.getAllInitPack()
	})
}
Player.getAllInitPack = function(){
	var players = [];
	for(var i in Player.list)
		players.push(Player.list[i].getInitPack());
	return players;
}

Player.onDisconnect = function(socket){
	delete Player.list[socket.id];
	removePack.player.push(socket.id);
}
Player.update = function(){
	var pack = [];
	for(var i in Player.list){
		var player = Player.list[i];
		player.update();
		pack.push(player.getUpdatePack());		
	}
	return pack;
}

var Shape = function(){
	var ANGLE = Math.random() * 360;
	var SPEED = 0.5;
	
	var self = {
		id:Math.random(),
		x:Math.random() * GAME_DIMENSION,
		y:Math.random() * GAME_DIMENSION,
		score:0,
		hp:0,
		maxhp:0,
		friction:0.98,
		speed:SPEED,
		toRemove:false,
		angle:ANGLE,
		speed:0.5,
		spdX:Math.cos(ANGLE/180*Math.PI) * SPEED,
		spdY:Math.sin(ANGLE/180*Math.PI) * SPEED,
		attacked:false,
		attackedTimer:0
	}
	
	self.update = function(){
		
		if(self.attacked && self.attackedTimer > 3){
			self.attacked = false;
			self.attackedTimer = 0;
		}else if(self.attacked){
			self.attackedTimer++;
		}
		var x = Math.cos(self.angle/180*Math.PI) * self.speed;
		var y = Math.sin(self.angle/180*Math.PI) * self.speed;
		
		//// SUPER UPDATE
		if(self.x + self.spdX < GAME_DIMENSION && self.x + self.spdX > 0){
			self.x += self.spdX;
		}
		if(self.y + self.spdY < GAME_DIMENSION && self.y + self.spdY > 0){
			self.y += self.spdY;
		}
		for(var i in Player.list){
			var p = Player.list[i];
			if(self.getDistance(p) < 50){
				self.attacked = true;
				p.hp -= Math.round((self.maxhp + 10)/3);
				self.hp -= p.bodyDamage + 10;
				if(p.hp <= 0){
					p.deathReset();
				}else if(self.hp <= 0){
					p.score += self.score;
				}else{
					var angle = Math.atan2(self.y-p.y, self.x-p.x);
					p.spdX -= Math.cos(angle) * 5;
					p.spdY -= Math.sin(angle) * 5;
				}
			}
		}
		//// SUPER UPDATE
		if(Math.abs(self.spdX - x) > 0.7 || Math.abs(self.spdY - y) > 0.7){
			self.spdX *= self.friction;
			self.spdY *= self.friction;
			self.stoppedSpeeding = false;
		}else if(!self.stoppedSpeeding){
			self.speed = 0.3;
			self.spdX = Math.cos(self.angle/180*Math.PI) * self.speed;
			self.spdY = Math.sin(self.angle/180*Math.PI) * self.speed;
			self.stoppedSpeeding = true;
		}
	}
	self.getDistance = function(pt){
		return Math.sqrt(Math.pow(self.x-pt.x,2) + Math.pow(self.y-pt.y,2));
	}
	self.getInitPack = function(){
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			hp:self.hp,
			maxhp:self.maxhp,		
		};
	}
	self.getUpdatePack = function(){
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			hp:self.hp,
			attacked:self.attacked,		
		};
	}
	return self;
}
//var timer = 0;
var numOfFarmPentagons = 0;
var numOfAlphaPentagons = 0;
var Pentagon = function(x,y,radius){
	var self = Shape();
	self.score = 130;
	self.hp = 130;
	self.maxhp = 130;
	if(typeof radius !== 'undefined')
		self.radius = radius;
	else self.radius = 30;
	
	var super_update = self.update;
	self.update = function(){
		super_update();
	}
	self.getInitPack = function(){
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			hp:self.hp,
			radius:self.radius,
			maxhp:self.maxhp,		
		};
	}
	Pentagon.list[self.id] = self;
	initPack.pentagon.push(self.getInitPack());
	return self;
}
Pentagon.list = {};

Pentagon.update = function(){
	var pack = [];
	var a = 0;
	
	if(numOfAlphaPentagons < 3){
		var x = Math.floor(Math.random()*(GAME_DIMENSION * 2/3 - GAME_DIMENSION * 1/3+1)+GAME_DIMENSION * 1/3);
		var y = Math.floor(Math.random()*(GAME_DIMENSION * 2/3 - GAME_DIMENSION * 1/3+1)+GAME_DIMENSION * 1/3);
		var ap = Pentagon(x,y,120);
		ap.hp = 10000;
		ap.maxhp = 10000;
		ap.score = 3500;
		numOfAlphaPentagons++;
	}
	
	if(Object.keys(Pentagon.list).length < 100){
		var t = Pentagon();
	}
	
	for(var i in Pentagon.list){
		a++;
		var pentagon = Pentagon.list[i];
		//if(pentagon.radius != 30) console.log(pentagon.hp);
		pentagon.update();
		if(pentagon.hp <= 0){
			delete Pentagon.list[i];
			removePack.pentagon.push(pentagon.id);
			//var a = Pentagon();
		} else
			pack.push(pentagon.getUpdatePack());	
	}
	return pack;
}

Pentagon.getAllInitPack = function(){
	var pentagons = [];
	for(var i in Pentagon.list)
		pentagons.push(Pentagon.list[i].getInitPack());
	return pentagons;
}

var Square = function(){
	var self = Shape();
	self.score = 10;
	self.hp = 10;
	self.maxhp = 10;
	
	var super_update = self.update;
	self.update = function(){
		super_update();
	}
	Square.list[self.id] = self;
	initPack.square.push(self.getInitPack());
	return self;
}
Square.list = {};

Square.update = function(){
	var pack = [];
	var a = 0;
	
	if(Object.keys(Square.list).length < 100){
		var t = Square();
	}
	
	for(var i in Square.list){
		a++;
		var square = Square.list[i];
		square.update();
		if(square.hp <= 0){
			delete Square.list[i];
			removePack.square.push(square.id);
			//var a = Square();
		} else
			pack.push(square.getUpdatePack());	
	}
	return pack;
}

Square.getAllInitPack = function(){
	var squares = [];
	for(var i in Square.list)
		squares.push(Square.list[i].getInitPack());
	return squares;
}

var Triangle = function(){
	var self = Shape();
	self.score = 25;
	self.hp = 25;
	self.maxhp = 25;
	var super_update = self.update;
	self.update = function(){
		super_update();
	}
	Triangle.list[self.id] = self;
	initPack.triangle.push(self.getInitPack());
	return self;
}
Triangle.list = {};

// what the heck

// ending what the heck

Triangle.update = function(){
	var pack = [];
	var a = 0;
	
	for(var i in Triangle.list){
		a++;
		var triangle = Triangle.list[i];
		triangle.update();
		if(triangle.hp <= 0){
			delete Triangle.list[i];
			removePack.triangle.push(triangle.id);
			//var a = Square();
		} else
			pack.push(triangle.getUpdatePack());	
	}
	return pack;
}

Triangle.getAllInitPack = function(){
	var triangles = [];
	for(var i in Triangle.list)
		triangles.push(Triangle.list[i].getInitPack());
	return triangles;
}

var Bullet = function(parent,angle,hp,speed,drone){
	var self = Entity();
	self.id = Math.random();
	if (typeof drone == 'undefined') {
    drone = false;
  }
  self.drone = drone;
	self.hp = hp;
	if(drone){
		self.speed = speed + Math.random() * 5 - 5;
	}else{
		self.speed = speed;
	}
	
	self.angle = angle;
	self.spdX = Math.cos(self.angle/180*Math.PI) * self.speed;
	self.spdY = Math.sin(self.angle/180*Math.PI) * self.speed;
	self.parent = parent;
	self.timer = 0;
	self.maxhp = hp;
	self.toRemove = false;	
	self.stationary = false;
	self.friction = 1;
	var super_update = self.update;
	self.update = function(){
		if(self.timer++ > 75 && !drone)
			self.toRemove = true;
		//if(self.hp <= 0) self.toRemove = true;
		super_update();
		self.spdX *= self.friction;
		self.spdY *= self.friction;
		if(!self.stationary){
			self.spdX = Math.cos(self.angle/180*Math.PI) * self.speed;
			self.spdY = Math.sin(self.angle/180*Math.PI) * self.speed;
		}
		
		if(!self.drone){
			for(var b in Bullet.list){
				var p = Bullet.list[b];
				if(p.parent != self.parent){
					if(self.getDistance(p) < 20){
						if(self.hp > p.hp){
							self.hp -= p.hp;
							p.hp = 0;
							p.toRemove = true;
						}else if(self.hp < p.hp){
							p.hp -= self.hp;
							self.hp = 0;
							self.toRemove = true;
						}else{
							p.hp = 0;
							self.hp = 0;
							self.toRemove = true;
							p.toRemove = true;
						}
					}
				}
			}
		}
		
		for(var i in Player.list){
			var p = Player.list[i];
			if(self.getDistance(p) < 32 && self.parent !== p.id){
				p.hp -= Math.round((370 - p.bodyDamage) * self.hp / 370);
				var angle = Math.atan2(self.y-p.y, self.x-p.x);
				p.spdX -= Math.cos(angle) * 2;
				p.spdY -= Math.sin(angle) * 2;
				if(p.hp <= 0){
					var shooter = Player.list[self.parent];
					if(shooter){
						shooter.score += p.score;
						p.score = Math.round(p.score / 2);
					}
					p.hp = p.hpMax;
					p.x = Math.random() * GAME_DIMENSION;
					p.y = Math.random() * GAME_DIMENSION;					
				}
				self.toRemove = true;
				if(self.hp > 0 && Player.list[self.parent].tankType == 22){
					for(var i = 0; i <= 720; i += 360 / Math.round(Math.random() * 4)){
						var b1 = Bullet(self.parent,self.angle+i,Math.floor(self.hp / 10),self.speed);
						var angle = Math.atan2(self.y-s.y, self.x-s.x);
						b1.x = self.x;// - Math.cos(angle) * 3;
						b1.y = self.y;// - Math.sin(angle) * 3;
					}
				}
			}
		}
		for(var i in Square.list){
			var s = Square.list[i];
			self.dealWithShapes(s);
		}
		for(var i in Pentagon.list){
			var s = Pentagon.list[i];
			self.dealWithShapes(s);
		}
		for(var i in Triangle.list){
			var s = Triangle.list[i];
			self.dealWithShapes(s);
		}
	}
	self.dealWithShapes = function(s){
		if(self.getDistance(s) < 45){
			var angle = Math.atan2(self.y-s.y, self.x-s.x);
			s.spdX -= Math.cos(angle) * 2;
			s.spdY -= Math.sin(angle) * 2;
			s.angle = -angle * 180 / Math.PI;
			s.attacked = true;
			s.hp -= self.hp;
			self.hp -= s.maxhp;
			if(self.hp <= 0) self.toRemove = true;
			if(s.hp <= 0){
				var shooter = Player.list[self.parent];
				if(shooter){
					shooter.score += s.score;
				}
				var a = Square();
			}
			if(self.hp > 0 && Player.list[self.parent].tankType == 22){
				for(var i = 0; i <= 720; i += 360 / Math.round(Math.random() * 2)){
					var b1 = Bullet(self.parent,self.angle+i,Math.floor(self.hp / 10),self.speed);
					var angle = Math.atan2(self.y-s.y, self.x-s.x);
					b1.x = self.x;// - Math.cos(angle) * 3;
					b1.y = self.y;// - Math.sin(angle) * 3;
				}
			}
		}
	}
	self.getInitPack = function(){
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			drone:self.drone,		
			angle:self.angle,
		};
	}
	self.getUpdatePack = function(){
		return {
			id:self.id,
			x:self.x,
			y:self.y,		
		};
	}
	
	Bullet.list[self.id] = self;
	initPack.bullet.push(self.getInitPack());
	return self;
}
Bullet.list = {};

Bullet.update = function(){
	var pack = [];
	for(var i in Bullet.list){
		var bullet = Bullet.list[i];
		bullet.update();
		if(bullet.toRemove){
			delete Bullet.list[i];
			removePack.bullet.push(bullet.id);
		} else
			pack.push(bullet.getUpdatePack());		
	}
	return pack;
}

Bullet.getAllInitPack = function(){
	var bullets = [];
	for(var i in Bullet.list)
		bullets.push(Bullet.list[i].getInitPack());
	return bullets;
}

var DEBUG = true;

var isValidPassword = function(data,cb){
	/*db.account.find({username:data.username,password:data.password},function(err,res){
		if(res.length > 0)
			cb(true);
		else
			cb(false);
	});*/
	cb(true);
}
var isUsernameTaken = function(data,cb){
	/*db.account.find({username:data.username},function(err,res){
		if(res.length > 0)
			cb(true);
		else
			cb(false);
	});*/
	cb(false);
}
var addUser = function(data,cb){
	//db.account.insert({username:data.username,password:data.password},function(err){
		cb();
	//});
}

var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;
	
	socket.on('signIn',function(data){
		isValidPassword(data,function(res){
			if(res){
				Player.onConnect(socket,data.username);
				for(var i = 0; i < 20; i++){
					var a = Square();
					var b = Pentagon();
					var c = Triangle();
				}
				socket.emit('signInResponse',{success:true});
			} else {
				socket.emit('signInResponse',{success:false});			
			}
		});
	});
	socket.on('signUp',function(data){
		isUsernameTaken(data,function(res){
			if(res){
				socket.emit('signUpResponse',{success:false});		
			} else {
				addUser(data,function(){
					socket.emit('signUpResponse',{success:true});					
				});
			}
		});		
	});
	
	
	socket.on('disconnect',function(){
		delete SOCKET_LIST[socket.id];
		Player.onDisconnect(socket);
	});
	socket.on('sendMsgToServer',function(data){
		var playerName = Player.list[socket.id].name;
		//console.log(Player.list);
		//console.log(playerName + ', ' + socketid);
		for(var i in SOCKET_LIST){
			SOCKET_LIST[i].emit('addToChat',playerName + ': ' + data);
		}
	});
	
	socket.on('evalServer',function(data){
		if(!DEBUG)
			return;
		var res = eval(data);
		socket.emit('evalAnswer',res);		
	});
	
	socket.on('dimension',function(data){
		WIDTH = data.width;
		HEIGHT = data.height;
	});
	
	socket.on('changeType',function(data){
		var p = Player.list[socket.id];
		if(p.availableUpgrades[0] == 1) p.availableUpgrades[0] = 0;
		if(p.availableUpgrades[1] == 1) p.availableUpgrades[1] = 0;
		if(p.availableUpgrades[2] == 1) p.availableUpgrades[2] = 0;
		p.level++;//what???
		console.log(data);
		var i = Player.tankProps[data.type.type];
		upgradeNewTank(p,i,data.type.type);
	});
	
	var upgradeNewTank = function(p,i,t){
		for(var a in p.bullets){
			p.bullets[a].toRemove = true;
		}
		p.tankType = t;
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
		
		p.regen = (p.maxRegen - p.minRegen) / levelUpCount * (levelUpCount - p.regenCount) + p.minRegen;
		p.hpMax = (p.maxHp - p.minHp) / levelUpCount * p.hpMaxCount + p.minHp;
		p.bulletHp = (p.maxBulletHp - p.minBulletHp) / levelUpCount * p.bulletHpCount + p.minBulletHp;
		p.bulletSpeed = (p.maxBulletSpeed - p.minBulletSpeed) / levelUpCount * p.bulletSpeedCount + p.minBulletSpeed;
		p.reload = (p.maxReload - p.minReload) / levelUpCount * (levelUpCount - p.reloadCount) + p.minReload;
		p.maxSpd = (p.maxBulletSpeed - p.minBulletSpeed) / levelUpCount * p.maxSpdCount + p.minBulletSpeed;
		p.bodyDamage = (p.maxBodyDamage - p.minBodyDamage) / levelUpCount * p.bodyDamageCount + p.minBodyDamage;
		//console.log(p.regen + ', ' + p.hpMax + ', ' + p.bulletHp + ', ' + p.bulletSpeed + ', ' + p.reload + ', ' + p.maxSpd);
	}
	var levelUpCount = 8;
	socket.on('regen',function(){
		var p = Player.list[socket.id];
		updateLevel(p.maxRegen, p.minRegen, levelUpCount - p.regenCount, p.regenCount, 0);
	});
	
	socket.on('maxhealth',function(){
		var p = Player.list[socket.id];
		updateLevel(p.maxHp, p.minHp, p.hpMaxCount, p.hpMaxCount, 1);
	});
	
	socket.on('bulletspeed',function(){
		var p = Player.list[socket.id];
		updateLevel(p.maxBulletSpeed, p.minBulletSpeed, p.bulletSpeedCount, p.bulletSpeedCount, 2);
	});
	
	socket.on('bulletHp',function(){
		var p = Player.list[socket.id];
		updateLevel(p.maxBulletHp, p.minBulletHp, p.bulletHpCount, p.bulletHpCount, 3);
	});
	
	socket.on('reload',function(){
		var p = Player.list[socket.id];
		updateLevel(p.maxReload, p.minReload, levelUpCount - p.reloadCount, p.reloadCount, 4);
	});
	
	socket.on('maxSpd',function(){
		var p = Player.list[socket.id];
		updateLevel(p.maxSpeed, p.minSpeed, p.maxSpdCount, p.maxSpdCount, 5);
	});
	
	socket.on('bodyDamage',function(){
		var p = Player.list[socket.id];
		updateLevel(p.maxBodyDamage, p.minBodyDamage, p.bodyDamageCount, p.bodyDamageCount, 6);
	});
	
	var updateLevel = function(max, min, count1, count2, index){
		var p = Player.list[socket.id];
		
		if(index == 4 || index == 0)
			var newValue = (max - min) / levelUpCount * (count1 - 1) + min;
		else
			var newValue = (max - min) / levelUpCount * (count1 + 1) + min;
		//console.log(max + ', ' + min + ', ' + count1 + ', ' + count2 + ', ' + newValue);
		if(count2 < levelUpCount){
			if(p.upgrades > 0){
				p.upgrades--;
				
				switch(index) {
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
				}
			}
		}
	}
	
});

var initPack = {player:[],bullet:[],square:[],pentagon:[]};
var removePack = {player:[],bullet:[],square:[],pentagon:[]};

setInterval(function(){
	var pack = {
		player:Player.update(),
		bullet:Bullet.update(),
		square:Square.update(),
		triangle:Triangle.update(),
		pentagon:Pentagon.update(),
	}
	
	for(var i in SOCKET_LIST){
		var socket = SOCKET_LIST[i];
		socket.emit('init',initPack);
		socket.emit('update',pack);
		socket.emit('remove',removePack);
	}
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
},1000/60);