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
		if(self.x + self.spdX < 4500 && self.x + self.spdX > 0){
			self.x += self.spdX;
		}
		if(self.y + self.spdY < 4500 && self.y + self.spdY > 0){
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
	self.x = Math.random() * 4500;
	self.y = Math.random() * 4500;
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
	self.lastScore = 0;
	
	self.timer = 0;
	
	self.regen = 21;
	self.hpMax = 100;
	self.bulletHp = 10;
	self.bulletSpeed = 15;
	self.reload = 38;
	self.maxSpd = 6;
	
	self.minRegen = 8;
	self.maxRegen = 21;
	
	self.minHp = 100;
	self.maxHp = 200;
	
	self.minBulletHp = 10;
	self.maxBulletHp = 30;
	
	self.minBulletSpeed = 5;
	self.maxBulletSpeed = 30;
	
	self.minReload = 11;
	self.maxReload = 38;
	
	self.minSpeed = 6;
	self.maxSpeed = 10;
	
	self.regenCount = 0;
	self.hpMaxCount = 0;
	self.bulletHpCount = 0;
	self.bulletSpeedCount = 0;
	self.reloadCount = 0;
	self.maxSpdCount = 0;
	self.bullets = [];
	self.moveTimer = 0;
	self.friction = 0.96;
	self.level = 1;
	self.mouseX = 0;
	self.mouseY = 0;
	
	self.availableUpgrades = [0,0,0];
	var super_update = self.update;
	self.update = function(){
		//self.regen();
		self.updateSpd();
		//console.log(self.reload);
		//console.log(self.score + ', ' + self.lastScore + ', ' + self.upgrades);
		if(self.score - self.lastScore > 100){
			self.level++;
			self.upgrades+=Math.floor((self.score - self.lastScore) / 100);
			self.lastScore = 100 * Math.floor(self.score / 100);
		}
		self.checkForUpgrades();
		//console.log(self.regen);
		if(self.timer % Math.round(self.regen) == 0){
			if(self.hp < self.hpMax){
				self.hp ++;
				//console.log('here');
			}
		}
		super_update();
		self.timer++;
		//console.log(self.reload);
		if(self.pressingAttack && self.timer % Math.round(self.reload) == 0){
			self.shootBullet(self.mouseAngle,self.mouseX,self.mouseY);
		}
		if(self.tankType == 7){
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
		if(self.level == 15 && !self.availableUpgrades[0])
			self.availableUpgrades[0] = true;
		if(self.level == 30 && !self.availableUpgrades[1])
			self.availableUpgrades[1] = true;
		if(self.level == 45 && !self.availableUpgrades[2]){
			self.availableUpgrades[2] = true;
			console.log(self.availableUpgrades[2]);
		}
		
		if(self.level == 15 && self.availableUpgrades[0]){
			tanks = [1, 5, 7];
			
		}else if(self.level == 30 && self.availableUpgrades[1]){
			if(self.tankType == 1){
				tanks = [4, 8];
			}else if(self.tankType == 5){
				tanks = [6];
			}else if(self.tankType == 7){
				tanks = [9];
			}
		}else if(self.level == 45 && self.availableUpgrades[2]){
			if(self.tankType == 4){
				tanks = [3, 9];
			}else if(self.tankType == 8){
				tanks = [3, 9];
			}else if(self.tankType == 6){
				tanks = [9];
			}else if(self.tankType == 9){
				tanks = [1, 2, 3, 4, 5, 6, 7, 8, 9];
			}
		}
		if(tanks.length != 0){
			SOCKET_LIST[self.id].emit('newTanks', {tanks:tanks});
		}
	}
	self.shootBullet = function(angle, x, y){
		//backward kick
		
		//console.log('shoot');
		var turbAngle = angle + 6 * Math.random() - 6;
		angle += 6 * Math.random() - 6;
		if(self.tankType === 0){
			self.spdX -= Math.cos(angle/180*Math.PI) * 0.5;
			self.spdY -= Math.sin(angle/180*Math.PI) * 0.5;
			var b = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
			b.x = self.x;
			b.y = self.y;
		} else if (self.tankType === 1) {
			
			turbAngle = -90 + turbAngle;
			if(self.reloadNum == 0){
				//console.log("0");
				self.spdX -= Math.cos(angle/180*Math.PI) * 0.5;
				self.spdY -= Math.sin(angle/180*Math.PI) * 0.5;
				var b1 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b1.x = self.x - Math.cos(turbAngle*Math.PI/180) * 17;
				b1.y = self.y - Math.sin(turbAngle*Math.PI/180) * 17;
				self.reloadNum = 1;
				//console.log("x: " + Math.sin(turbAngle*Math.PI/180));
			}else if(self.reloadNum == 1){
				self.spdX -= Math.cos(angle/180*Math.PI) * 0.5;
				self.spdY -= Math.sin(angle/180*Math.PI) * 0.5;
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
				self.spdX -= Math.cos(angle/180*Math.PI) * 1;
				self.spdY -= Math.sin(angle/180*Math.PI) * 1;
				var b1 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b1.x = self.x - Math.cos(turbAngle*Math.PI/180) * 15;
				b1.y = self.y - Math.sin(turbAngle*Math.PI/180) * 15;
				var b2 = Bullet(self.id,angle,self.bulletHp,self.bulletSpeed);
				b2.x = self.x + Math.cos(turbAngle*Math.PI/180)* 20;
				b2.y = self.y + Math.sin(turbAngle*Math.PI/180) * 20;
				self.reloadNum = 1;
			}else if(self.reloadNum == 1){
				self.spdX -= Math.cos(angle/180*Math.PI) * 0.5;
				self.spdY -= Math.sin(angle/180*Math.PI) * 0.5;
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
			self.spdX += Math.cos(angle/180*Math.PI) * 1;
			self.spdY += Math.sin(angle/180*Math.PI) * 1;
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
			self.spdX += Math.cos(angle/180*Math.PI) * 1.5;
			self.spdY += Math.sin(angle/180*Math.PI) * 1.5;
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
			self.spdX += Math.cos(angle/180*Math.PI) * 1.5;
			self.spdY += Math.sin(angle/180*Math.PI) * 1.5;
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
		} 
	}
	self.deathReset = function(){
		self.hp = self.hpMax;
		self.x = Math.random() * 4500;
		self.y = Math.random() * 4500;			
	}
	self.regdden = function(){
		if(self.timer % self.regen == 0){
			if(self.hp < self.hpMax)
				self.hp ++;
		}
	}
	var smoothMvmtTimer = 0;
	self.updateSpd = function(){
		if(self.pressingRight && self.x < 4500){
			if(self.spdX < self.maxSpd) self.spdX++;
		}
		else if(self.pressingLeft && self.x > 0){
			if(self.spdX > -self.maxSpd) self.spdX--;
		}
		
		if(self.pressingUp && self.y > 0){
			if(self.spdY > -self.maxSpd) self.spdY--;
		}
		else if(self.pressingDown && self.y < 4500){
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
	minBulletHp: 10, maxBulletHp: 30, minBulletSpeed: 5, maxBulletSpeed: 30, minReload: 11, maxReload: 38},
	{ name: 'twin', minRegen: 6, maxRegen: 21, minSpeed: 6, maxSpeed: 9, minHp: 100, maxHp: 160, 
	minBulletHp: 10, maxBulletHp: 50, minBulletSpeed: 5, maxBulletSpeed: 20, minReload: 3, maxReload: 21},
	{ name: 'triplet', minRegen: 4, maxRegen: 21, minSpeed: 6, maxSpeed: 10, minHp: 100, maxHp: 170, 
	minBulletHp: 10, maxBulletHp: 55, minBulletSpeed: 5, maxBulletSpeed: 23, minReload: 3, maxReload: 21},
	{ name: 'octotank', minRegen: 4, maxRegen: 21, minSpeed: 6, maxSpeed: 10, minHp: 100, maxHp: 180, 
	minBulletHp: 10, maxBulletHp: 40, minBulletSpeed: 15, maxBulletSpeed: 23, minReload: 4, maxReload: 21},
	{ name: 'triple twin', minRegen: 4, maxRegen: 21, minSpeed: 6, maxSpeed: 10, minHp: 100, maxHp: 180, 
	minBulletHp: 10, maxBulletHp: 40, minBulletSpeed: 15, maxBulletSpeed: 23, minReload: 4, maxReload: 21},
	{ name: 'triangle', minRegen: 4, maxRegen: 21, minSpeed: 6, maxSpeed: 10, minHp: 100, maxHp: 180, 
	minBulletHp: 10, maxBulletHp: 40, minBulletSpeed: 15, maxBulletSpeed: 23, minReload: 4, maxReload: 21},
	{ name: 'booster', minRegen: 4, maxRegen: 21, minSpeed: 6, maxSpeed: 10, minHp: 100, maxHp: 180, 
	minBulletHp: 10, maxBulletHp: 40, minBulletSpeed: 15, maxBulletSpeed: 23, minReload: 4, maxReload: 21},
	{ name: 'overseer', minRegen: 4, maxRegen: 21, minSpeed: 6, maxSpeed: 10, minHp: 100, maxHp: 180, 
	minBulletHp: 10, maxBulletHp: 40, minBulletSpeed: 15, maxBulletSpeed: 23, minReload: 4, maxReload: 21},
	{ name: 'twin flank', minRegen: 4, maxRegen: 21, minSpeed: 6, maxSpeed: 10, minHp: 100, maxHp: 180, 
	minBulletHp: 10, maxBulletHp: 40, minBulletSpeed: 15, maxBulletSpeed: 23, minReload: 4, maxReload: 21},
	{ name: 'decatank', minRegen: 4, maxRegen: 21, minSpeed: 6, maxSpeed: 10, minHp: 100, maxHp: 180, 
	minBulletHp: 10, maxBulletHp: 40, minBulletSpeed: 15, maxBulletSpeed: 23, minReload: 4, maxReload: 21},
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
		else if(data.inputId === 'attack')
			player.pressingAttack = data.state;
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
	var self = {
		x:-1000,
		y:-1000,
		score:0,
		hp:0,
		maxhp:0,
	}
	self.update = function(){
		if(self.x + self.spdX < 4500 && self.x + self.spdX > 0){
			self.x += self.spdX;
		}
		if(self.y + self.spdY < 4500 && self.y + self.spdY > 0){
			self.y += self.spdY;
		}
		for(var i in Player.list){
			var p = Player.list[i];
			if(self.getDistance(p) < 50){
				p.score += self.score;
				self.hp -= p.hpMax;
				p.hp -= self.maxhp;
				//console.log(p.hp);
				if(p.hp < 0) p.deathReset();
				else p.x += 2; p.y += 2;
			}
		}
	}
	self.getDistance = function(pt){
		return Math.sqrt(Math.pow(self.x-pt.x,2) + Math.pow(self.y-pt.y,2));
	}
	return self;
}

var Pentagon = function(){
	var self = Shape();
	self.id = Math.random();
	self.x = Math.random() * 4500;
	self.y = Math.random() * 4500;
	self.score = 150;
	self.hp = 150;
	self.maxhp = 150;
	self.toRemove = false;
	self.angle = Math.random() * 360;
	self.speed = 0.1;
	self.spdX = Math.cos(self.angle/180*Math.PI) * self.speed;
	self.spdY = Math.sin(self.angle/180*Math.PI) * self.speed;
	self.attacked = false;
	self.attackedTimer = 0;
	var super_update = self.update;
	self.update = function(){
		if(self.attacked && self.attackedTimer > 2){
			self.attacked = false;
			self.attackedTimer = 0;
		}else if(self.attacked){
			self.attackedTimer++;
		}
		super_update();
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
	Pentagon.list[self.id] = self;
	initPack.pentagon.push(self.getInitPack());
	return self;
}
Pentagon.list = {};

Pentagon.update = function(){
	var pack = [];
	var a = 0;
	for(var i in Pentagon.list){
		a++;
		var pentagon = Pentagon.list[i];
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
	self.id = Math.random();
	self.x = Math.random() * 4500;
	self.y = Math.random() * 4500;
	self.score = 15;
	self.hp = 15;
	self.maxhp = 15;
	self.toRemove = false;
	self.angle = Math.random() * 360;
	self.speed = 0.2;
	self.spdX = Math.cos(self.angle/180*Math.PI) * self.speed;
	self.spdY = Math.sin(self.angle/180*Math.PI) * self.speed;
	self.attacked = false;
	self.attackedTimer = 0;
	var super_update = self.update;
	self.update = function(){
		if(self.attacked && self.attackedTimer > 3){
			self.attacked = false;
			self.attackedTimer = 0;
		}else if(self.attacked){
			self.attackedTimer++;
		}
		super_update();
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
	Square.list[self.id] = self;
	initPack.square.push(self.getInitPack());
	return self;
}
Square.list = {};

Square.update = function(){
	var pack = [];
	var a = 0;
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
	self.id = Math.random();
	self.x = Math.random() * 4500;
	self.y = Math.random() * 4500;
	self.score = 20;
	self.hp = 20;
	self.maxhp = 20;
	self.toRemove = false;
	self.angle = Math.random() * 360;
	self.speed = 0.1;
	self.spdX = Math.cos(self.angle/180*Math.PI) * self.speed;
	self.spdY = Math.sin(self.angle/180*Math.PI) * self.speed;
	self.attacked = false;
	self.attackedTimer = 0;
	var super_update = self.update;
	self.update = function(){
		super_update();
		if(self.attacked && self.attackedTimer > 3){
			self.attacked = false;
			self.attackedTimer = 0;
		}else if(self.attacked){
			self.attackedTimer++;
		}
		super_update();
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
	Triangle.list[self.id] = self;
	initPack.triangle.push(self.getInitPack());
	return self;
}
Triangle.list = {};

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
	self.toRemove = false;	
	self.stationary = false;
	self.friction = 1;
	var super_update = self.update;
	self.update = function(){
		if(self.timer++ > 70 && !drone)
			self.toRemove = true;
		super_update();
		self.spdX *= self.friction;
		self.spdY *= self.friction;
		if(!self.stationary){
			self.spdX = Math.cos(self.angle/180*Math.PI) * self.speed;
			self.spdY = Math.sin(self.angle/180*Math.PI) * self.speed;
		}else{
			//self.angle+=0.1;
			//self.spdX = Math.cos(self.angle/180*Math.PI) * self.speed;
			//self.spdY = Math.sin(self.angle/180*Math.PI) * self.speed;
		}
		/*if (typeof Player.list[self.parent].bullets == 'undefined') {
			for(var i in Player.list[self.parent].bullets){
				var b = Player.list[self.parent].bullets[i];
				if(self.getDistance(b) < 15){
					if(Math.random < 0.5){
						self.spdX -= 8;
						self.spdY -= 8;
						b.spdX += 8;
						b.spdY += 8;
					}else{
						self.spdX -= 8;
						self.spdY += 8;
						b.spdX += 8;
						b.spdY -= 8;
						
					}
				}
			}
		}*/
		
		for(var i in Player.list){
			var p = Player.list[i];
			if(self.getDistance(p) < 32 && self.parent !== p.id){
				p.hp -= self.hp;
								
				if(p.hp <= 0){
					var shooter = Player.list[self.parent];
					if(shooter){
						shooter.score += p.score;
						p.score = Math.round(p.score / 2);
					}
					p.hp = p.hpMax;
					p.x = Math.random() * 4500;
					p.y = Math.random() * 4500;					
				}
				self.toRemove = true;
			}
		}
		for(var i in Square.list){
			var s = Square.list[i];
			if(self.getDistance(s) < 32){
				//console.log('red attacked!');
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
				} else self.toRemove = true;
			}
			
		}
		for(var i in Pentagon.list){
			var s = Pentagon.list[i];
			if(self.getDistance(s) < 32 && self.hp > 0){
				s.attacked = true;
				//console.log('red attacked!');
				s.hp -= self.hp;
				self.hp -= s.maxhp;
				if(self.hp <= 0) self.toRemove = true;
				if(s.hp <= 0){
					var shooter = Player.list[self.parent];
					if(shooter){
						shooter.score += s.score;
					}
					var p = Pentagon();
				} else self.toRemove = true;
			}
			
		}
		for(var i in Triangle.list){
			var s = Triangle.list[i];
			if(self.getDistance(s) < 32 && self.hp > 0){
				s.attacked = true;
				//console.log('red attacked!');
				s.hp -= self.hp;
				self.hp -= s.maxhp;
				if(self.hp <= 0) self.toRemove = true;
				if(s.hp <= 0){
					var shooter = Player.list[self.parent];
					if(shooter){
						shooter.score += s.score;
					}
					var p = Triangle();
				} else self.toRemove = true;
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
				for(var i = 0; i < 30; i++){
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
		var i = Player.tankProps[data.type];
		upgradeNewTank(p,i,data.type);
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
		
		p.regen = (p.maxRegen - p.minRegen) / 5 * (5 - p.regenCount) + p.minRegen;
		p.hpMax = (p.maxHp - p.minHp) / 5 * p.hpMaxCount + p.minHp;
		p.bulletHp = (p.maxBulletHp - p.minBulletHp) / 5 * p.bulletHpCount + p.minBulletHp;
		p.bulletSpeed = (p.maxBulletSpeed - p.minBulletSpeed) / 5 * p.bulletSpeedCount + p.minBulletSpeed;
		p.reload = (p.maxReload - p.minReload) / 5 * (5 - p.reloadCount) + p.minReload;
		p.maxSpd = (p.maxBulletSpeed - p.minBulletSpeed) / 5 * p.maxSpdCount + p.minBulletSpeed;
		//console.log(p.regen + ', ' + p.hpMax + ', ' + p.bulletHp + ', ' + p.bulletSpeed + ', ' + p.reload + ', ' + p.maxSpd);
	}
	
	socket.on('regen',function(){
		var p = Player.list[socket.id];
		updateLevel(p.maxRegen, p.minRegen, 5 - p.regenCount, p.regenCount, 0);
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
		updateLevel(p.maxReload, p.minReload, 5 - p.reloadCount, p.reloadCount, 4);
	});
	
	socket.on('maxSpd',function(){
		var p = Player.list[socket.id];
		updateLevel(p.maxSpeed, p.minSpeed, p.maxSpdCount, p.maxSpdCount, 5);
	});
	
	var updateLevel = function(max, min, count1, count2, index){
		var p = Player.list[socket.id];
		
		if(index == 4 || index == 0)
			var newValue = (max - min) / 5 * (count1 - 1) + min;
		else
			var newValue = (max - min) / 5 * (count1 + 1) + min;
		console.log(max + ', ' + min + ', ' + count1 + ', ' + count2 + ', ' + newValue);
		if(count2 < 5){
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