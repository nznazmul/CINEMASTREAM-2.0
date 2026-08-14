package com.cinemastream.app;

import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import androidx.appcompat.app.AppCompatActivity;

/**
 * Native ExoPlayer Activity for low-latency, hardware-accelerated 4K/HLS playback
 * (Inspired by KiduyuTV ExoPlayer architecture)
 */
public class ExoPlayerActivity extends AppCompatActivity {

    private String streamUrl;
    private String mediaTitle;
    private long playbackPosition = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Keep screen on during playback
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemUI();

        // Get Stream parameters passed from intent
        if (getIntent() != null) {
            streamUrl = getIntent().getStringExtra("STREAM_URL");
            mediaTitle = getIntent().getStringExtra("MEDIA_TITLE");
            playbackPosition = getIntent().getLongExtra("START_POSITION", 0);
        }
    }

    private void hideSystemUI() {
        View decorView = getWindow().getDecorView();
        decorView.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN
        );
    }
}
