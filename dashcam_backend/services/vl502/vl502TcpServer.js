/**
 * VL502 TCP Server
 * Handles VL502 device connections
 */

import net from 'net';
import VL502Handler from './vl502.js';

class VL502TCPServer {
  constructor(port) {
    this.port = port;
    this.server = null;
    this.handler = new VL502Handler();
    this.connections = new Map(); // socket -> clientInfo
  }

  /**
   * Start TCP server
   */
  start() {
    this.server = net.createServer((socket) => {
      this.handleConnection(socket);
    });

    this.server.on('error', (error) => {
      console.error('❌ VL502 Server error:', error.message);
    });

    this.server.listen(this.port, '0.0.0.0', () => {
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║           VL502 TCP SERVER STARTED                         ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      console.log(`🌐 Listening on: 0.0.0.0:${this.port}`);
      console.log(`📡 Protocol: VL502 (Jimi IoT V1.2.3)`);
      console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
      console.log('');
      console.log('Waiting for VL502 device connections...');
      console.log('════════════════════════════════════════════════════════════');
    });
  }

  /**
   * Handle new connection
   */
  handleConnection(socket) {
    const clientInfo = {
      address: socket.remoteAddress,
      port: socket.remotePort,
      connectedAt: new Date()
    };

    this.connections.set(socket, clientInfo);

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║              NEW VL502 DEVICE CONNECTED                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`🔌 Remote: ${clientInfo.address}:${clientInfo.port}`);
    console.log(`⏰ Time: ${clientInfo.connectedAt.toLocaleString()}`);
    console.log(`📊 Total connections: ${this.connections.size}`);
    console.log('════════════════════════════════════════════════════════════');

    // Set socket options
    socket.setKeepAlive(true, 60000);
    socket.setTimeout(300000); // 5 minutes

    // Data handler
    socket.on('data', async (data) => {
      try {
        await this.handler.handleMessage(socket, data, clientInfo);
      } catch (error) {
        console.error('');
        console.error('❌ DATA HANDLER ERROR:', error.message);
        console.error(error.stack);
      }
    });

    // Error handler
    socket.on('error', (error) => {
      console.error('');
      console.error('❌ SOCKET ERROR:', error.message);
      console.error(`   Client: ${clientInfo.address}:${clientInfo.port}`);
    });

    // Close handler
    socket.on('close', (hadError) => {
      this.connections.delete(socket);
      
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║              VL502 DEVICE DISCONNECTED                     ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      console.log(`🔌 Remote: ${clientInfo.address}:${clientInfo.port}`);
      console.log(`⏰ Time: ${new Date().toLocaleString()}`);
      console.log(`📊 Remaining connections: ${this.connections.size}`);
      if (hadError) {
        console.log(`⚠️ Closed with error`);
      }
      console.log('════════════════════════════════════════════════════════════');
    });

    // Timeout handler
    socket.on('timeout', () => {
      console.log('');
      console.log('⏱️ Socket timeout - closing connection');
      console.log(`   Client: ${clientInfo.address}:${clientInfo.port}`);
      socket.end();
    });
  }

  /**
   * Stop server
   */
  stop() {
    if (this.server) {
      console.log('');
      console.log('🛑 Stopping VL502 TCP server...');
      
      // Close all connections
      for (const socket of this.connections.keys()) {
        socket.end();
      }

      this.server.close(() => {
        console.log('✅ VL502 TCP server stopped');
      });
    }
  }

  /**
   * Get server status
   */
  getStatus() {
    return {
      running: this.server !== null && this.server.listening,
      port: this.port,
      connections: this.connections.size,
      uptime: this.server ? process.uptime() : 0
    };
  }
}

export default VL502TCPServer;