// Location: atlas/client/src/test/ephemeral_decryptor.test.ts
// Unit & Integration Tests for Stage 17.3: Ephemeral Client-Side Asset Decryption via WebAssembly / WebCrypto

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  EphemeralDecryptorEngine,
  ephemeralDecryptor,
  wipeMemory,
  type EncryptedAssetEnvelope,
} from '$engine/ephemeral_decryptor';

describe('Stage 17.3: Ephemeral Client-Side Asset Decryption Engine', () => {
  let engine: EphemeralDecryptorEngine;

  beforeEach(() => {
    engine = new EphemeralDecryptorEngine();
  });

  afterEach(() => {
    engine.wipeAll();
  });

  it('securely wipes memory buffer to all zeros with wipeMemory()', () => {
    const buffer = new Uint8Array([1, 2, 3, 4, 5, 42, 99, 255]);
    expect(buffer.some((b) => b !== 0)).toBe(true);
    wipeMemory(buffer);
    expect(buffer.every((b) => b === 0)).toBe(true);
  });

  it('registers ephemeral key with TTL and isolates raw key bytes', async () => {
    const rawKey = new Uint8Array(32);
    for (let i = 0; i < 32; i++) rawKey[i] = i + 1;

    const handle = await engine.registerEphemeralKey('layer_alpha_key', rawKey, 'AES-GCM', 5000);
    expect(handle.keyId).toBe('layer_alpha_key');
    expect(handle.algorithm).toBe('AES-GCM');
    expect(handle.isWiped).toBe(false);
    expect(engine.getState().activeKeyHandles).toBe(1);

    // Wipe key
    handle.wipe();
    expect(handle.isWiped).toBe(true);
    expect(engine.getState().activeKeyHandles).toBe(0);
    expect(engine.getState().totalWipedBuffers).toBeGreaterThanOrEqual(1);
  });

  it('encrypts and decrypts cartographic assets via AES-GCM directly into memory', async () => {
    const rawKey = new Uint8Array(32).fill(0x77);
    const mockGeoJson = JSON.stringify({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { name: 'Bubble Nebula Sector', danger: 'Caustic' } },
      ],
    });
    const plaintextBytes = new TextEncoder().encode(mockGeoJson);

    // Register key
    await engine.registerEphemeralKey('aes_key_1', rawKey, 'AES-GCM');

    // Encrypt envelope
    const envelope = await engine.encryptAssetEnvelope(
      'vector_layer_sol',
      'cartographic_vector',
      plaintextBytes,
      rawKey,
      'AES-GCM',
      { layerName: 'Core Systems Vector Mesh', featureCount: 1 }
    );

    expect(envelope.assetId).toBe('vector_layer_sol');
    expect(envelope.algorithm).toBe('AES-GCM');
    expect(envelope.ciphertextBase64.length).toBeGreaterThan(0);

    // Decrypt using key ID
    const decrypted = await engine.decryptAssetEnvelope(envelope, 'aes_key_1');
    expect(decrypted.assetId).toBe('vector_layer_sol');
    expect(decrypted.byteLength).toBe(plaintextBytes.length);

    const decryptedText = new TextDecoder().decode(decrypted.buffer);
    expect(decryptedText).toBe(mockGeoJson);

    // Ensure wipe works cleanly
    decrypted.wipe();
    const wipedBytes = new Uint8Array(decrypted.buffer);
    expect(wipedBytes.every((b) => b === 0)).toBe(true);
  });

  it('encrypts and decrypts proprietary stellar assets via ChaCha20-Poly1305 (RFC 8439)', async () => {
    const rawKey = new Uint8Array(32);
    for (let i = 0; i < 32; i++) rawKey[i] = (i * 7 + 13) % 256;

    const mockStellarMesh = new Float32Array([0.0, 1.5, 3.2, -10.5, 42.0, 100.25]);
    const meshBytes = new Uint8Array(mockStellarMesh.buffer);

    await engine.registerEphemeralKey('chacha_key_1', rawKey, 'ChaCha20-Poly1305');

    const envelope = await engine.encryptAssetEnvelope(
      'stellar_mesh_sag_a',
      'stellar_mesh',
      meshBytes,
      rawKey,
      'ChaCha20-Poly1305',
      { featureCount: mockStellarMesh.length }
    );

    expect(envelope.algorithm).toBe('ChaCha20-Poly1305');

    const decrypted = await engine.decryptAssetEnvelope(envelope, 'chacha_key_1');
    expect(decrypted.byteLength).toBe(meshBytes.length);

    const decodedFloats = new Float32Array(decrypted.buffer);
    expect(decodedFloats[0]).toBeCloseTo(0.0);
    expect(decodedFloats[1]).toBeCloseTo(1.5);
    expect(decodedFloats[3]).toBeCloseTo(-10.5);
    expect(decodedFloats[4]).toBeCloseTo(42.0);

    decrypted.wipe();
    expect(new Uint8Array(decrypted.buffer).every((b) => b === 0)).toBe(true);
  });

  it('rejects tampered ChaCha20-Poly1305 payloads with authentication error', async () => {
    const rawKey = new Uint8Array(32).fill(0x33);
    const data = new TextEncoder().encode('Confidential exploration waypoint data');

    const envelope = await engine.encryptAssetEnvelope(
      'tamper_test',
      'exploration_dataset',
      data,
      rawKey,
      'ChaCha20-Poly1305'
    );

    // Tamper ciphertext
    const rawCipher = engine.base64ToBytes(envelope.ciphertextBase64);
    rawCipher[0] ^= 0xff; // Flip bits
    envelope.ciphertextBase64 = engine.bytesToBase64(rawCipher);

    await expect(
      engine.decryptAssetEnvelope(envelope, rawKey)
    ).rejects.toThrow(/authentication tag verification failed|tampered/i);
  });

  it('supports stream decoding of multiple asset envelopes on-the-fly without disk retention', async () => {
    const rawKey = new Uint8Array(32).fill(0x42);
    await engine.registerEphemeralKey('stream_key', rawKey, 'ChaCha20-Poly1305');

    const chunks = ['Sector A-10', 'Sector A-11', 'Sector A-12'].map((s) => new TextEncoder().encode(s));
    const envelopes: EncryptedAssetEnvelope[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const env = await engine.encryptAssetEnvelope(
        `chunk_${i}`,
        'exploration_dataset',
        chunks[i],
        rawKey,
        'ChaCha20-Poly1305'
      );
      envelopes.push(env);
    }

    const results: string[] = [];
    for await (const dec of engine.decodeAssetStream(envelopes, 'stream_key')) {
      results.push(new TextDecoder().decode(dec.buffer));
      dec.wipe();
    }

    expect(results).toEqual(['Sector A-10', 'Sector A-11', 'Sector A-12']);
    expect(engine.getState().totalAssetsDecrypted).toBe(3);
    expect(engine.getState().activeAllocatedBytes).toBe(0);
  });

  it('purges expired ephemeral keys automatically', async () => {
    const rawKey = new Uint8Array(32).fill(0x88);
    // Key expires immediately (-10ms)
    await engine.registerEphemeralKey('expired_key', rawKey, 'AES-GCM', -10);

    const purged = engine.purgeExpiredKeys();
    expect(purged).toBe(1);
    expect(engine.getState().activeKeyHandles).toBe(0);
  });

  it('wipeAll cleanses active keys and active allocated decrypted buffers', async () => {
    const rawKey = new Uint8Array(32).fill(0x99);
    await engine.registerEphemeralKey('key_wipe_all', rawKey, 'ChaCha20-Poly1305');

    const env = await engine.encryptAssetEnvelope(
      'wipe_asset',
      'cartographic_vector',
      new TextEncoder().encode('Wipe me'),
      rawKey,
      'ChaCha20-Poly1305'
    );

    const dec = await engine.decryptAssetEnvelope(env, 'key_wipe_all');
    expect(engine.getState().activeAllocatedBytes).toBeGreaterThan(0);
    expect(engine.getState().activeKeyHandles).toBe(1);

    engine.wipeAll();

    expect(engine.getState().activeAllocatedBytes).toBe(0);
    expect(engine.getState().activeKeyHandles).toBe(0);
    expect(new Uint8Array(dec.buffer).every((b) => b === 0)).toBe(true);
  });
});
