// API service for backend calls
// Use localhost for local development, or set NEXT_PUBLIC_API_URL in .env.local
const API_URL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : 'http://98.70.101.16:5000');

class ApiService {
  // Device APIs (devices table)
  async getDevices(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.status) queryParams.append('status', params.status);
      if (params.deviceModel) queryParams.append('deviceModel', params.deviceModel);
      if (params.search) queryParams.append('search', params.search);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const queryString = queryParams.toString();
      const url = `${API_URL}/api/admin/devices${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error ${response.status}:`, errorText);
        throw new Error(`Failed to fetch devices: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }

  async getDeviceById(id) {
    const response = await fetch(`${API_URL}/api/admin/devices/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch device');
    }
    return response.json();
  }

  async getDeviceByIMEI(imei) {
    const response = await fetch(`${API_URL}/api/admin/devices/imei/${imei}`);
    if (!response.ok) {
      throw new Error('Failed to fetch device');
    }
    return response.json();
  }

  // Location APIs
  async getDeviceLocation(imei) {
    const response = await fetch(`${API_URL}/api/locations/${imei}`);
    if (!response.ok) {
      throw new Error('Failed to fetch device location');
    }
    return response.json();
  }

  async getAllDevicesLocations() {
    const response = await fetch(`${API_URL}/api/locations`);
    if (!response.ok) {
      throw new Error('Failed to fetch devices locations');
    }
    return response.json();
  }

  async getDeviceLocationHistory(imei, limit = 100, startDate, endDate) {
    let url = `${API_URL}/api/locations/${imei}/history?limit=${limit}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch location history');
    }
    return response.json();
  }

  // Add device
  async addDevice(deviceData) {
    const response = await fetch(`${API_URL}/api/admin/devices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deviceData),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to add device');
    }
    return response.json();
  }

  // Update device
  async updateDevice(id, deviceData) {
    const response = await fetch(`${API_URL}/api/admin/devices/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deviceData),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to update device');
    }
    return response.json();
  }

  // Update device status
  async updateDeviceStatus(imei, status) {
    const response = await fetch(`${API_URL}/api/admin/devices/${imei}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      throw new Error('Failed to update device status');
    }
    return response.json();
  }

  // Delete device
  async deleteDevice(id) {
    const response = await fetch(`${API_URL}/api/admin/devices/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to delete device');
    }
    return response.json();
  }

  // ==================== Device Inventory APIs (device_inventory table) ====================

  async getDeviceInventory(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.status) queryParams.append('status', params.status);
      if (params.deviceModel) queryParams.append('deviceModel', params.deviceModel);
      if (params.category) queryParams.append('category', params.category);
      if (params.vendor) queryParams.append('vendor', params.vendor);
      if (params.search) queryParams.append('search', params.search);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const queryString = queryParams.toString();
      const url = `${API_URL}/api/admin/inventory${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error ${response.status}:`, errorText);
        throw new Error(`Failed to fetch device inventory: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }

  async getDeviceInventoryById(id) {
    const response = await fetch(`${API_URL}/api/admin/inventory/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch device inventory');
    }
    return response.json();
  }

  async addDeviceInventory(inventoryData) {
    const response = await fetch(`${API_URL}/api/admin/inventory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(inventoryData),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to add device inventory');
    }
    return response.json();
  }

  async updateDeviceInventory(id, inventoryData) {
    const response = await fetch(`${API_URL}/api/admin/inventory/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(inventoryData),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to update device inventory');
    }
    return response.json();
  }

  async deleteDeviceInventory(id) {
    const response = await fetch(`${API_URL}/api/admin/inventory/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to delete device inventory');
    }
    return response.json();
  }

  // Get live location (latest from database)
  async getLiveLocation(imei) {
    const response = await fetch(`${API_URL}/api/locations/${imei}/live`);
    if (!response.ok) {
      throw new Error('Failed to fetch live location');
    }
    return response.json();
  }

  // Request location from device
  async requestLocation(imei) {
    const response = await fetch(`${API_URL}/api/devices/${imei}/request-location`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to request location');
    }
    return response.json();
  }

  // Start RTMP stream for device
  // cameraIndex: 0 = front camera, 1 = rear camera
  async startRTMPStream(imei, rtmpUrl = null, cameraIndex = 0) {
    const response = await fetch(`${API_URL}/api/devices/${imei}/start-rtmp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rtmpUrl, cameraIndex }),
    });
    if (!response.ok) {
      throw new Error('Failed to start RTMP stream');
    }
    return response.json();
  }

  // Stop RTMP stream for device
  async stopRTMPStream(imei) {
    const response = await fetch(`${API_URL}/api/devices/${imei}/stop-rtmp`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to stop RTMP stream');
    }
    return response.json();
  }

  // Admin APIs
  async adminRegister(email, password) {
    const response = await fetch(`${API_URL}/api/admin/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }
    return data;
  }

  async verifyRegistrationOTP(email, otp) {
    const response = await fetch(`${API_URL}/api/admin/verify-registration-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'OTP verification failed');
    }
    return data;
  }

  async resendRegistrationOTP(email) {
    const response = await fetch(`${API_URL}/api/admin/resend-registration-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to resend OTP');
    }
    return data;
  }

  async adminLogin(email, password) {
    const response = await fetch(`${API_URL}/api/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    return data;
  }

  async verifyLoginOTP(email, otp) {
    const response = await fetch(`${API_URL}/api/admin/verify-login-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'OTP verification failed');
    }
    return data;
  }

  async resendLoginOTP(email) {
    const response = await fetch(`${API_URL}/api/admin/resend-login-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to resend OTP');
    }
    return data;
  }

  async getAdminProfile(token) {
    const response = await fetch(`${API_URL}/api/admin/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to get profile');
    }
    return data;
  }

  // User APIs
  async userRegister(companyName, email, companyType, password, confirmPassword) {
    const response = await fetch(`${API_URL}/api/user/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ companyName, email, companyType, password, confirmPassword }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }
    return data;
  }

  async userLogin(email, password) {
    const response = await fetch(`${API_URL}/api/user/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    return data;
  }

  async forgotPassword(email) {
    const response = await fetch(`${API_URL}/api/user/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to send reset code');
    }
    return data;
  }

  async resetPassword(email, otp, newPassword, confirmPassword) {
    const response = await fetch(`${API_URL}/api/user/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp, newPassword, confirmPassword }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Password reset failed');
    }
    return data;
  }

  async getUserProfile(token) {
    const response = await fetch(`${API_URL}/api/user/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to get profile');
    }
    return data;
  }

  // User Device APIs
  async getUserDevices(params = {}) {
    const token = localStorage.getItem('userToken');
    if (!token) {
      throw new Error('User not authenticated');
    }

    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.status) queryParams.append('status', params.status);
    if (params.search) queryParams.append('search', params.search);
    if (params.category) queryParams.append('category', params.category);

    const queryString = queryParams.toString();
    const url = `${API_URL}/api/user/devices${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch devices');
    }
    return data;
  }

  // Start video stream for device
  async startVideoStream(imei, cameraIndex = 0) {
    const token = localStorage.getItem('userToken');
    if (!token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_URL}/api/devices/${imei}/start-rtmp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ cameraIndex }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to start video stream');
    }
    return data;
  }

  // Stop video stream for device
  async stopVideoStream(imei) {
    const token = localStorage.getItem('userToken');
    if (!token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_URL}/api/devices/${imei}/stop-rtmp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to stop video stream');
    }
    return data;
  }

  // User track history (similar to Tracksolid Pro "Tracks" view)
  async getUserTrack(params = {}) {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('userToken')
      : null;

    if (!token) {
      throw new Error('User not authenticated');
    }

    const queryParams = new URLSearchParams();
    if (params.imei) queryParams.append('imei', params.imei);
    if (params.startTime) queryParams.append('startTime', params.startTime);
    if (params.endTime) queryParams.append('endTime', params.endTime);
    // Only add positionType if it's provided and not "All"
    if (params.positionType && params.positionType !== 'All' && params.positionType !== 'all') {
      queryParams.append('positionType', params.positionType);
    }

    const queryString = queryParams.toString();
    const url = `${API_URL}/api/user/tracks${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch track data');
    }
    return data;
  }

  async addUserDevice(deviceData) {
    const token = localStorage.getItem('userToken');
    if (!token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_URL}/api/user/device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(deviceData),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to add device');
    }
    return data;
  }
}

export default new ApiService();

