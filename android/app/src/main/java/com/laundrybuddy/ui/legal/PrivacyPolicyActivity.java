package com.laundrybuddy.ui.legal;

import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;

import com.laundrybuddy.databinding.ActivityPrivacyPolicyBinding;

/**
 * Privacy Policy Activity
 */
public class PrivacyPolicyActivity extends AppCompatActivity {

    private ActivityPrivacyPolicyBinding binding;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityPrivacyPolicyBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        binding.backButton.setOnClickListener(v -> finish());
    }
}
