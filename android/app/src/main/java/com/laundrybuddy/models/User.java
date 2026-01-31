package com.laundrybuddy.models;

import com.google.gson.annotations.SerializedName;

/**
 * User model matching backend User schema
 */
public class User {

    @SerializedName("_id")
    private String id;

    @SerializedName("name")
    private String name;

    @SerializedName("email")
    private String email;

    @SerializedName("hostelRoom")
    private String hostelRoom;

    @SerializedName("phone")
    private String phone;

    @SerializedName("profilePhoto")
    private String profilePhoto;

    @SerializedName("role")
    private String role;

    @SerializedName("isVerified")
    private boolean isVerified;

    @SerializedName("createdAt")
    private String createdAt;

    @SerializedName("lastLoginAt")
    private String lastLoginAt;

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getHostelRoom() {
        return hostelRoom;
    }

    public void setHostelRoom(String hostelRoom) {
        this.hostelRoom = hostelRoom;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getProfilePhoto() {
        return profilePhoto;
    }

    public void setProfilePhoto(String profilePhoto) {
        this.profilePhoto = profilePhoto;
    }

    public String getRole() {
        return role != null ? role : "student";
    }

    public void setRole(String role) {
        this.role = role;
    }

    public boolean isVerified() {
        return isVerified;
    }

    public void setVerified(boolean verified) {
        isVerified = verified;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getLastLoginAt() {
        return lastLoginAt;
    }

    public void setLastLoginAt(String lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }

    public boolean isAdmin() {
        return "admin".equalsIgnoreCase(role) || "laundry".equalsIgnoreCase(role);
    }

    public boolean isStaff() {
        return "laundry".equalsIgnoreCase(role) || "staff".equalsIgnoreCase(role);
    }
}
