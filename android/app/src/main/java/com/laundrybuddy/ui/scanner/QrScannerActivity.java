package com.laundrybuddy.ui.scanner;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.view.PreviewView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;
import com.laundrybuddy.databinding.ActivityQrScannerBinding;
import com.laundrybuddy.utils.QrCodeScanner;
import com.laundrybuddy.utils.ToastManager;

import java.io.IOException;

/**
 * QR Code Scanner Activity
 * Uses CameraX and ML Kit for barcode scanning
 */
public class QrScannerActivity extends AppCompatActivity implements QrCodeScanner.QrScanCallback {

    public static final String EXTRA_SCANNED_CONTENT = "scanned_content";
    public static final int RESULT_SCANNED = 1001;
    private static final int CAMERA_PERMISSION_CODE = 100;

    private ActivityQrScannerBinding binding;
    private QrCodeScanner qrScanner;

    private final ActivityResultLauncher<Intent> galleryLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                    Uri imageUri = result.getData().getData();
                    if (imageUri != null) {
                        scanFromImage(imageUri);
                    }
                }
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityQrScannerBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        qrScanner = new QrCodeScanner(this, this);

        setupClickListeners();
        checkCameraPermission();
    }

    private void setupClickListeners() {
        binding.closeButton.setOnClickListener(v -> finish());

        binding.galleryButton.setOnClickListener(v -> {
            Intent intent = new Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI);
            galleryLauncher.launch(intent);
        });
    }

    private void checkCameraPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            startScanning();
        } else {
            ActivityCompat.requestPermissions(this,
                    new String[] { Manifest.permission.CAMERA },
                    CAMERA_PERMISSION_CODE);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
            @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_PERMISSION_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startScanning();
            } else {
                ToastManager.showError(this, "Camera permission required for QR scanning");
                finish();
            }
        }
    }

    private void startScanning() {
        PreviewView previewView = binding.cameraPreview;
        qrScanner.startScanning(previewView, this);
        updateStatus("Scanning...");
    }

    private void scanFromImage(Uri imageUri) {
        try {
            InputImage image = InputImage.fromFilePath(this, imageUri);
            BarcodeScanning.getClient()
                    .process(image)
                    .addOnSuccessListener(barcodes -> {
                        for (Barcode barcode : barcodes) {
                            String value = barcode.getRawValue();
                            if (value != null && !value.isEmpty()) {
                                onQrCodeScanned(value);
                                return;
                            }
                        }
                        ToastManager.showError(this, "No QR code found in image");
                    })
                    .addOnFailureListener(e -> {
                        ToastManager.showError(this, "Failed to scan image");
                    });
        } catch (IOException e) {
            ToastManager.showError(this, "Failed to load image");
        }
    }

    private void updateStatus(String message) {
        binding.scannerStatus.setText(message);
    }

    @Override
    public void onQrCodeScanned(String content) {
        runOnUiThread(() -> {
            updateStatus("QR Code found!");
            ToastManager.showSuccess(this, "QR Code scanned!");

            // Return result to calling activity
            Intent resultIntent = new Intent();
            resultIntent.putExtra(EXTRA_SCANNED_CONTENT, content);
            setResult(RESULT_SCANNED, resultIntent);
            finish();
        });
    }

    @Override
    public void onError(String error) {
        runOnUiThread(() -> {
            updateStatus("Error: " + error);
            ToastManager.showError(this, error);
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (qrScanner != null && ContextCompat.checkSelfPermission(this,
                Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            qrScanner.resumeScanning();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (qrScanner != null) {
            qrScanner.stopScanning();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (qrScanner != null) {
            qrScanner.release();
        }
    }
}
