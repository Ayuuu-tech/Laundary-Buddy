package com.laundrybuddy.ui.legal;

import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;

import com.laundrybuddy.databinding.ActivityTermsOfServiceBinding;

/**
 * Terms of Service Activity
 */
public class TermsOfServiceActivity extends AppCompatActivity {

    private ActivityTermsOfServiceBinding binding;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityTermsOfServiceBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        binding.backButton.setOnClickListener(v -> finish());
    }
}
