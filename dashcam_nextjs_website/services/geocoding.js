// Reverse geocoding service to get address from coordinates
class GeocodingService {
  // Using OpenStreetMap Nominatim API (free, no key required)
  async getAddressFromCoordinates(latitude, longitude) {
    try {
      if (!latitude || !longitude) {
        return null;
      }

      // Use Nominatim API for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'okDriver-Tracking-System' // Required by Nominatim
          }
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }

      const data = await response.json();
      
      if (data && data.address) {
        // Format address from components
        const addr = data.address;
        const addressParts = [];
        
        // Build address string
        if (addr.road) addressParts.push(addr.road);
        if (addr.suburb || addr.neighbourhood) addressParts.push(addr.suburb || addr.neighbourhood);
        if (addr.city || addr.town || addr.village) addressParts.push(addr.city || addr.town || addr.village);
        if (addr.state) addressParts.push(addr.state);
        if (addr.postcode) addressParts.push(addr.postcode);
        if (addr.country) addressParts.push(addr.country);
        
        return addressParts.length > 0 ? addressParts.join(', ') : data.display_name || null;
      }
      
      return data.display_name || null;
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      return null;
    }
  }

  // Cache addresses to avoid too many API calls
  addressCache = new Map();
  
  getCachedAddress(latitude, longitude) {
    const key = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
    return this.addressCache.get(key);
  }
  
  setCachedAddress(latitude, longitude, address) {
    const key = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
    this.addressCache.set(key, address);
    // Limit cache size to 100 entries
    if (this.addressCache.size > 100) {
      const firstKey = this.addressCache.keys().next().value;
      this.addressCache.delete(firstKey);
    }
  }

  async getAddress(latitude, longitude) {
    // Check cache first
    const cached = this.getCachedAddress(latitude, longitude);
    if (cached) {
      return cached;
    }

    // Fetch from API
    const address = await this.getAddressFromCoordinates(latitude, longitude);
    
    // Cache the result
    if (address) {
      this.setCachedAddress(latitude, longitude, address);
    }
    
    return address;
  }
}

export default new GeocodingService();
