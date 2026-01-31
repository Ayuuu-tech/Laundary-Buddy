package com.laundrybuddy.utils;

import android.content.Context;
import android.graphics.Bitmap;
import android.util.Log;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;

import java.util.HashMap;
import java.util.Map;

/**
 * Utility class for generating QR codes
 */
public class QrCodeGenerator {

    private static final String TAG = "QrCodeGenerator";
    private static final int DEFAULT_SIZE = 512;

    /**
     * Generate a QR code bitmap from text
     */
    public static Bitmap generateQrCode(String content) {
        return generateQrCode(content, DEFAULT_SIZE);
    }

    /**
     * Generate a QR code bitmap with custom size
     */
    public static Bitmap generateQrCode(String content, int size) {
        try {
            Map<EncodeHintType, Object> hints = new HashMap<>();
            hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
            hints.put(EncodeHintType.MARGIN, 1);

            QRCodeWriter writer = new QRCodeWriter();
            BitMatrix bitMatrix = writer.encode(content, BarcodeFormat.QR_CODE, size, size, hints);

            int width = bitMatrix.getWidth();
            int height = bitMatrix.getHeight();
            Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565);

            for (int x = 0; x < width; x++) {
                for (int y = 0; y < height; y++) {
                    bitmap.setPixel(x, y, bitMatrix.get(x, y) ? 0xFF000000 : 0xFFFFFFFF);
                }
            }

            return bitmap;
        } catch (WriterException e) {
            Log.e(TAG, "Error generating QR code", e);
            return null;
        }
    }

    /**
     * Generate QR code content for an order
     */
    public static String buildOrderQrContent(String orderNumber, String studentName,
            String hostelRoom, int itemCount, String status) {
        // Compact JSON-like format for scanning
        return String.format(
                "{\"t\":\"%s\",\"n\":\"%s\",\"r\":\"%s\",\"c\":%d,\"s\":\"%s\"}",
                orderNumber, studentName, hostelRoom, itemCount, status);
    }
}
