/**
 * VL502 Commands - Build and send protocol messages
 */

class VL502Commands {
  /**
   * Send Registration Response (0x8100)
   * 
   * @param {net.Socket} socket - TCP socket
   * @param {number} responseSeqNo - Sequence number from registration request
   * @param {number} result - 0:success, 1:fail, 2:no vehicle, 3:exists, 4:no terminal
   * @param {string} authCode - Base key (only on success)
   * @param {string} terminalSN - 14-digit IMEI
   */
  sendRegistrationResponse(socket, responseSeqNo, result, authCode, terminalSN) {
    console.log('');
    console.log('📤 SENDING REGISTRATION RESPONSE (0x8100):');
    console.log(`   Sequence Number: ${responseSeqNo}`);
    console.log(`   Result: ${result} ${this.getResultName(result)}`);
    console.log(`   Auth Code: "${authCode}"`);
    console.log(`   Terminal SN: ${terminalSN}`);

    const authBuf = (result === 0x00 && authCode) ? Buffer.from(authCode, 'utf-8') : Buffer.alloc(0);
    const body = Buffer.alloc(3 + authBuf.length);

    body.writeUInt16BE(responseSeqNo, 0);
    body.writeUInt8(result, 2);

    if (authBuf.length > 0) {
      authBuf.copy(body, 3);
    }

    this.sendPacket(socket, 0x8100, terminalSN, body, 0);
  }

  /**
   * Send General Response (0x8001)
   * 
   * @param {net.Socket} socket
   * @param {number} responseSeqNo
   * @param {number} responseId
   * @param {number} result
   * @param {string} terminalSN
   */
  sendGeneralResponse(socket, responseSeqNo, responseId, result, terminalSN) {
    console.log('');
    console.log('📤 SENDING GENERAL RESPONSE (0x8001):');
    console.log(`   Response to: 0x${responseId.toString(16).padStart(4, '0')}`);
    console.log(`   Sequence: ${responseSeqNo}`);
    console.log(`   Result: ${result}`);

    const body = Buffer.alloc(5);
    body.writeUInt16BE(responseSeqNo, 0);
    body.writeUInt16BE(responseId, 2);
    body.writeUInt8(result, 4);

    this.sendPacket(socket, 0x8001, terminalSN, body, responseSeqNo);
  }

  /**
   * Send Time Sync (0x8103 with parameter 0xF014)
   * 
   * @param {net.Socket} socket
   * @param {string} terminalSN
   */
  sendTimeSync(socket, terminalSN) {
    console.log('');
    console.log('⏰ SENDING TIME SYNC (0x8103):');
    
    const now = new Date();
    console.log(`   UTC Time: ${now.toUTCString()}`);

    // Parameter 0xF014: BCD[6] YY-MM-DD-HH-MM-SS (UTC)
    const timeBCD = Buffer.alloc(6);
    timeBCD[0] = this.toBCD(now.getUTCFullYear() - 2000);
    timeBCD[1] = this.toBCD(now.getUTCMonth() + 1);
    timeBCD[2] = this.toBCD(now.getUTCDate());
    timeBCD[3] = this.toBCD(now.getUTCHours());
    timeBCD[4] = this.toBCD(now.getUTCMinutes());
    timeBCD[5] = this.toBCD(now.getUTCSeconds());

    // Build 0x8103 body: total params (1) + param ID (2) + length (1) + value (6)
    const body = Buffer.concat([
      Buffer.from([1]),              // Total params
      Buffer.from([0xF0, 0x14]),     // Param ID: 0xF014
      Buffer.from([6]),              // Param length
      timeBCD                        // Param value
    ]);

    this.sendPacket(socket, 0x8103, terminalSN, body, 0);
  }

  /**
   * Send a complete VL502 packet
   * 
   * Frame structure: 0x7E | [escaped: header + body + checksum] | 0x7E
   * 
   * @param {net.Socket} socket
   * @param {number} messageId - Message ID (WORD)
   * @param {string} terminalSN - 14-digit IMEI
   * @param {Buffer} body - Message body
   * @param {number} sequenceNumber - Sequence number (WORD)
   */
  sendPacket(socket, messageId, terminalSN, body, sequenceNumber = 0) {
    try {
      const bodyLength = body.length;

      // ══════════════════════════════════════════════════════════════
      // Build header (12 bytes)
      // ══════════════════════════════════════════════════════════════
      const header = Buffer.alloc(12);
      let offset = 0;

      // Message ID (2 bytes)
      header.writeUInt16BE(messageId, offset);
      offset += 2;

      // Body properties (2 bytes): just length, no encryption
      header.writeUInt16BE(bodyLength & 0x3FF, offset);
      offset += 2;

      // Terminal SN (6 bytes): encode 14-digit IMEI as UInt48 big-endian
      const snBuffer = this.encodeTerminalSN(terminalSN);
      snBuffer.copy(header, offset);
      offset += 6;

      // Sequence number (2 bytes)
      header.writeUInt16BE(sequenceNumber & 0xFFFF, offset);

      // ══════════════════════════════════════════════════════════════
      // Combine header + body
      // ══════════════════════════════════════════════════════════════
      const rawMsg = Buffer.concat([header, body]);

      // ══════════════════════════════════════════════════════════════
      // Calculate XOR checksum
      // ══════════════════════════════════════════════════════════════
      let checksum = 0;
      for (const byte of rawMsg) {
        checksum ^= byte;
      }

      // ══════════════════════════════════════════════════════════════
      // Append checksum
      // ══════════════════════════════════════════════════════════════
      const msgWithChecksum = Buffer.concat([rawMsg, Buffer.from([checksum])]);

      // ══════════════════════════════════════════════════════════════
      // Escape: 0x7E -> 0x7D 0x02, 0x7D -> 0x7D 0x01
      // ══════════════════════════════════════════════════════════════
      const escapedMsg = this.escapeMessage(msgWithChecksum);

      // ══════════════════════════════════════════════════════════════
      // Wrap with delimiters
      // ══════════════════════════════════════════════════════════════
      const packet = Buffer.concat([
        Buffer.from([0x7E]),
        escapedMsg,
        Buffer.from([0x7E])
      ]);

      console.log(`   Packet size: ${packet.length} bytes`);
      console.log(`   Packet hex: ${packet.toString('hex')}`);

      // ══════════════════════════════════════════════════════════════
      // Send
      // ══════════════════════════════════════════════════════════════
      if (socket && !socket.destroyed) {
        socket.write(packet);
        console.log('   ✅ Packet sent successfully');
      } else {
        console.error('   ❌ Socket not writable');
      }

    } catch (error) {
      console.error('❌ Send packet error:', error.message);
    }
  }

  /**
   * Escape message bytes
   * 0x7E -> 0x7D 0x02
   * 0x7D -> 0x7D 0x01
   */
  escapeMessage(buffer) {
    const result = [];
    for (const byte of buffer) {
      if (byte === 0x7E) {
        result.push(0x7D, 0x02);
      } else if (byte === 0x7D) {
        result.push(0x7D, 0x01);
      } else {
        result.push(byte);
      }
    }
    return Buffer.from(result);
  }

  /**
   * Encode 14-digit IMEI as 6-byte UInt48 big-endian
   * 
   * Protocol: "Convert first 14 digits of IMEI to 6-byte hex"
   * Example: IMEI "86499306096800" -> numeric value -> 6-byte buffer
   * 
   * @param {string} imeiStr - 14 or 15 digit IMEI
   * @returns {Buffer} 6-byte buffer
   */
  encodeTerminalSN(imeiStr) {
    // Take first 14 digits
    let digits = imeiStr.replace(/\D/g, '');
    if (digits.length > 14) {
      digits = digits.substring(0, 14);
    }

    // Pad to 14 digits if shorter
    digits = digits.padStart(14, '0');

    // Convert to BigInt
    const val = BigInt(digits);

    // Convert to 6-byte hex (12 hex chars)
    const hex = val.toString(16).padStart(12, '0');

    console.log(`   Encoding IMEI: ${digits}`);
    console.log(`   As BigInt: ${val}`);
    console.log(`   As 6-byte hex: ${hex}`);

    return Buffer.from(hex, 'hex');
  }

  /**
   * Convert number to BCD byte
   * @param {number} value - 0-99
   * @returns {number} BCD byte
   */
  toBCD(value) {
    const tens = Math.floor(value / 10);
    const ones = value % 10;
    return (tens << 4) | ones;
  }

  /**
   * Get result name
   */
  getResultName(result) {
    const names = {
      0x00: '(Success)',
      0x01: '(Failed)',
      0x02: '(No vehicle)',
      0x03: '(Terminal exists)',
      0x04: '(No terminal)'
    };
    return names[result] || '';
  }
}

export default VL502Commands;