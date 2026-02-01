package com.laundrybuddy.utils;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageManager;
import android.util.Log;
import android.util.Size;

import androidx.annotation.NonNull;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageProxy;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.lifecycle.LifecycleOwner;

import com.google.common.util.concurrent.ListenableFuture;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScannerOptions;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;

import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * QR Code Scanner using ML Kit and CameraX
 */
public class QrCodeScanner {

    private static final String TAG = "QrCodeScanner";
    public static final int CAMERA_PERMISSION_CODE = 1001;

    private final Context context;
    private final LifecycleOwner lifecycleOwner;
    private ProcessCameraProvider cameraProvider;
    private final ExecutorService cameraExecutor;
    private BarcodeScanner barcodeScanner;
    private QrScanCallback callback;
    private boolean isScanning = false;

    public interface QrScanCallback {
        void onQrCodeScanned(String content);

        void onError(String error);
    }

    public QrCodeScanner(Context context, LifecycleOwner lifecycleOwner) {
        this.context = context;
        this.lifecycleOwner = lifecycleOwner;
        this.cameraExecutor = Executors.newSingleThreadExecutor();

        // Configure barcode scanner for QR codes only
        BarcodeScannerOptions options = new BarcodeScannerOptions.Builder()
                .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                .build();
        this.barcodeScanner = BarcodeScanning.getClient(options);
    }

    /**
     * Check if camera permission is granted
     */
    public boolean hasCameraPermission() {
        return ContextCompat.checkSelfPermission(context,
                Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
    }

    /**
     * Request camera permission
     */
    public void requestCameraPermission(Activity activity) {
        ActivityCompat.requestPermissions(activity,
                new String[] { Manifest.permission.CAMERA },
                CAMERA_PERMISSION_CODE);
    }

    /**
     * Start camera preview and QR scanning
     */
    public void startScanning(PreviewView previewView, QrScanCallback callback) {
        this.callback = callback;
        this.isScanning = true;

        ListenableFuture<ProcessCameraProvider> cameraProviderFuture = ProcessCameraProvider.getInstance(context);

        cameraProviderFuture.addListener(() -> {
            try {
                cameraProvider = cameraProviderFuture.get();
                bindPreview(previewView);
            } catch (ExecutionException | InterruptedException e) {
                Log.e(TAG, "Error starting camera", e);
                if (callback != null) {
                    callback.onError("Failed to start camera: " + e.getMessage());
                }
            }
        }, ContextCompat.getMainExecutor(context));
    }

    @androidx.annotation.OptIn(markerClass = androidx.camera.core.ExperimentalGetImage.class)
    private void bindPreview(PreviewView previewView) {
        if (cameraProvider == null)
            return;

        // Unbind previous use cases
        cameraProvider.unbindAll();

        // Preview use case
        Preview preview = new Preview.Builder().build();
        preview.setSurfaceProvider(previewView.getSurfaceProvider());

        // Image analysis use case for QR scanning
        ImageAnalysis imageAnalysis = new ImageAnalysis.Builder()
                .setTargetResolution(new Size(1280, 720))
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build();

        imageAnalysis.setAnalyzer(cameraExecutor, this::analyzeImage);

        // Select back camera
        CameraSelector cameraSelector = new CameraSelector.Builder()
                .requireLensFacing(CameraSelector.LENS_FACING_BACK)
                .build();

        try {
            cameraProvider.bindToLifecycle(lifecycleOwner, cameraSelector, preview, imageAnalysis);
        } catch (Exception e) {
            Log.e(TAG, "Error binding camera", e);
            if (callback != null) {
                callback.onError("Failed to bind camera: " + e.getMessage());
            }
        }
    }

    @androidx.camera.core.ExperimentalGetImage
    private void analyzeImage(ImageProxy imageProxy) {
        if (!isScanning || imageProxy.getImage() == null) {
            imageProxy.close();
            return;
        }

        InputImage image = InputImage.fromMediaImage(
                imageProxy.getImage(),
                imageProxy.getImageInfo().getRotationDegrees());

        barcodeScanner.process(image)
                .addOnSuccessListener(barcodes -> {
                    for (Barcode barcode : barcodes) {
                        String rawValue = barcode.getRawValue();
                        if (rawValue != null && !rawValue.isEmpty() && callback != null && isScanning) {
                            isScanning = false; // Stop after first successful scan
                            callback.onQrCodeScanned(rawValue);
                            break;
                        }
                    }
                })
                .addOnFailureListener(e -> {
                    Log.e(TAG, "Barcode scanning failed", e);
                })
                .addOnCompleteListener(task -> imageProxy.close());
    }

    /**
     * Stop scanning
     */
    public void stopScanning() {
        isScanning = false;
        if (cameraProvider != null) {
            cameraProvider.unbindAll();
        }
    }

    /**
     * Resume scanning
     */
    public void resumeScanning() {
        isScanning = true;
    }

    /**
     * Release resources
     */
    public void release() {
        stopScanning();
        cameraExecutor.shutdown();
        if (barcodeScanner != null) {
            barcodeScanner.close();
        }
    }
}
