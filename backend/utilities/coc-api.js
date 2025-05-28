// Rate limiter configuration
const rateLimiter = {
    maxRequests: 5,
    timeWindow: 60000, // 1 minute
    requests: [],
    
    checkLimit: function() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.timeWindow);
        
        if (this.requests.length >= this.maxRequests) {
            const oldestRequest = this.requests[0];
            const timeToWait = Math.ceil((this.timeWindow - (now - oldestRequest)) / 1000);
            throw new Error(`Rate limit exceeded. Please wait ${timeToWait} seconds before trying again.`);
        }
        
        this.requests.push(now);
        return true;
    }
};

// Cache configuration
const cocApiCache = {
    data: new Map(),
    maxSize: 10,
    timeToLive: 3600000, // 1 hour
    
    set: function(key, value) {
        if (this.data.size >= this.maxSize) {
            const firstKey = this.data.keys().next().value;
            this.data.delete(firstKey);
        }
        
        this.data.set(key, {
            value: value,
            timestamp: Date.now()
        });
    },
    
    get: function(key) {
        const item = this.data.get(key);
        if (!item) return null;
        
        if (Date.now() - item.timestamp > this.timeToLive) {
            this.data.delete(key);
            return null;
        }
        
        return item.value;
    }
};

// CoC API functions
const cocApi = {
    // Data lokal dari JSON
    async loadDefenseData() {
        try {
            // Muat data dari file JSON
            const response = await fetch('../../backend/coc.json');
            let jsonData = await response.json();
            
            // Array untuk menyimpan semua pertahanan
            const defenses = [];
            
            // Proses semua item dalam JSON
            jsonData.forEach(item => {
                // Tentukan jenis pertahanan berdasarkan URL
                let defenseType = 'unknown';
                let defenseName = 'Defense';
                
                if (item["web-scraper-start-url"]) {
                    if (item["web-scraper-start-url"].includes("Air_Defense")) {
                        defenseType = 'airDefense';
                        defenseName = 'Air Defense';
                    } else if (item["web-scraper-start-url"].includes("Mortar")) {
                        defenseType = 'mortar';
                        defenseName = 'Mortar';
                    } else if (item["web-scraper-start-url"].includes("Cannon")) {
                        defenseType = 'cannon';
                        defenseName = 'Cannon';
                    } else if (item["web-scraper-start-url"].includes("Archer_Tower")) {
                        defenseType = 'archerTower';
                        defenseName = 'Archer Tower';
                    }
                }
                
                // Tambahkan ke array pertahanan
                defenses.push({
                    name: defenseName,
                    type: defenseType,
                    level: parseInt(item.Level),
                    townHallLevelRequired: parseInt(item["Town Hall Level Required"]),
                    upgradeTime: item["Build Time"],
                    upgradeCost: item.Cost,
                    damagePerSecond: parseInt(item["Damage per Second"]),
                    damagePerShot: parseInt(item["Damage per Shot"] || "0"),
                    damagePerAttack: parseInt(item["Damage per Attack"] || "0"),
                    hitpoints: item.Hitpoints ? item.Hitpoints.toString().replace(/,/g, '') : "0",
                    buildTime: item["Build Time"],
                    experienceGained: parseInt((item["Experience Gained"] || "0").toString().replace(/,/g, ''))
                });
            });
            
            // Log untuk debugging
            console.log(`Loaded ${defenses.length} total defenses`);
            
            return {
                defenses: defenses
            };
        } catch (error) {
            console.error('Error loading defense data:', error);
            // Fallback ke empty data jika gagal load
            return {
                defenses: []
            };
        }
    },
    
    // Cache untuk menyimpan data
    cache: {
        data: null,
        timestamp: 0,
        ttl: 3600000 // 1 jam
    },
    
    // Get defense data (dari cache atau load ulang)
    async getDefenseData(type = null) {
        console.log('Getting defense data for:', type || 'all');
        
        // Cek cache
        const now = Date.now();
        if (!this.cache.data || now - this.cache.timestamp > this.cache.ttl) {
            // Cache expired atau belum ada, load data baru
            this.cache.data = await this.loadDefenseData();
            this.cache.timestamp = now;
        }
        
        // Return data sesuai tipe yang diminta
        if (type && type !== 'all') {
            // Filter berdasarkan tipe
            return {
                defenses: this.cache.data.defenses.filter(defense => defense.type === type)
            };
        } else {
            // Return semua data
            return this.cache.data;
        }
    },
    
    // Filter defenses by Town Hall level
    filterByTownHall(defenses, townHallLevel) {
        if (!defenses || !Array.isArray(defenses)) return [];
        
        // Filter to only show defenses that are upgradable at this specific TH level
        return defenses.filter(defense => defense.townHallLevelRequired === townHallLevel);
    },
    
    // Get cannon data filtered by Town Hall level
    async getCannons(townHallLevel = null) {
        const data = await this.getDefenseData('cannon');
        const defenses = data.defenses || [];
        
        if (townHallLevel === null) {
            return defenses;
        }
        
        return this.filterByTownHall(defenses, townHallLevel);
    },
    
    // Get archer tower data filtered by Town Hall level
    async getArcherTowers(townHallLevel = null) {
        const data = await this.getDefenseData('archerTower');
        const defenses = data.defenses || [];
        
        if (townHallLevel === null) {
            return defenses;
        }
        
        return this.filterByTownHall(defenses, townHallLevel);
    },
    
    // Get mortar data filtered by Town Hall level
    async getMortars(townHallLevel = null) {
        const data = await this.getDefenseData('mortar');
        const defenses = data.defenses || [];
        
        if (townHallLevel === null) {
            return defenses;
        }
        
        return this.filterByTownHall(defenses, townHallLevel);
    },
    
    // Get air defense data filtered by Town Hall level
    async getAirDefenses(townHallLevel = null) {
        const data = await this.getDefenseData('airDefense');
        const defenses = data.defenses || [];
        
        if (townHallLevel === null) {
            return defenses;
        }
        
        return this.filterByTownHall(defenses, townHallLevel);
    },
    
    // Get all defense data filtered by Town Hall level
    async getAllDefenses(townHallLevel = null) {
        const data = await this.getDefenseData();
        const defenses = data.defenses || [];
        
        if (townHallLevel === null) {
            return defenses;
        }
        
        return this.filterByTownHall(defenses, townHallLevel);
    }
};
