package com.laundrybuddy.models;

import com.google.gson.JsonDeserializationContext;
import com.google.gson.JsonDeserializer;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParseException;
import com.google.gson.JsonSerializationContext;
import com.google.gson.JsonSerializer;

import java.lang.reflect.Type;

/**
 * Custom Gson adapter to handle 'user' field that can be either:
 * - A String (user ID when not populated)
 * - A PopulatedUser object (when using .populate('user'))
 */
public class UserFieldAdapter implements JsonDeserializer<Order.PopulatedUser>, JsonSerializer<Order.PopulatedUser> {

    @Override
    public Order.PopulatedUser deserialize(JsonElement json, Type typeOfT, JsonDeserializationContext context)
            throws JsonParseException {
        if (json == null || json.isJsonNull()) {
            return null;
        }

        // If it's a string (user ID), return null since user wasn't populated
        if (json.isJsonPrimitive() && json.getAsJsonPrimitive().isString()) {
            return null;
        }

        // If it's an object, manually parse it to avoid infinite recursion
        if (json.isJsonObject()) {
            JsonObject obj = json.getAsJsonObject();
            Order.PopulatedUser user = new Order.PopulatedUser();
            
            // Manually set fields using reflection or create setters
            // For now, we parse manually since PopulatedUser has no setters
            try {
                java.lang.reflect.Field idField = Order.PopulatedUser.class.getDeclaredField("id");
                idField.setAccessible(true);
                if (obj.has("_id") && !obj.get("_id").isJsonNull()) {
                    idField.set(user, obj.get("_id").getAsString());
                }
                
                java.lang.reflect.Field nameField = Order.PopulatedUser.class.getDeclaredField("name");
                nameField.setAccessible(true);
                if (obj.has("name") && !obj.get("name").isJsonNull()) {
                    nameField.set(user, obj.get("name").getAsString());
                }
                
                java.lang.reflect.Field emailField = Order.PopulatedUser.class.getDeclaredField("email");
                emailField.setAccessible(true);
                if (obj.has("email") && !obj.get("email").isJsonNull()) {
                    emailField.set(user, obj.get("email").getAsString());
                }
                
                java.lang.reflect.Field phoneField = Order.PopulatedUser.class.getDeclaredField("phone");
                phoneField.setAccessible(true);
                if (obj.has("phone") && !obj.get("phone").isJsonNull()) {
                    phoneField.set(user, obj.get("phone").getAsString());
                }
                
                java.lang.reflect.Field addressField = Order.PopulatedUser.class.getDeclaredField("address");
                addressField.setAccessible(true);
                if (obj.has("address") && !obj.get("address").isJsonNull()) {
                    addressField.set(user, obj.get("address").getAsString());
                }
            } catch (Exception e) {
                android.util.Log.e("UserFieldAdapter", "Error parsing PopulatedUser", e);
                return null;
            }
            
            return user;
        }

        return null;
    }

    @Override
    public JsonElement serialize(Order.PopulatedUser src, Type typeOfSrc, JsonSerializationContext context) {
        if (src == null) {
            return null;
        }
        // Manual serialization to avoid recursion
        JsonObject obj = new JsonObject();
        if (src.getId() != null) obj.addProperty("_id", src.getId());
        if (src.getName() != null) obj.addProperty("name", src.getName());
        if (src.getEmail() != null) obj.addProperty("email", src.getEmail());
        if (src.getPhone() != null) obj.addProperty("phone", src.getPhone());
        if (src.getAddress() != null) obj.addProperty("address", src.getAddress());
        return obj;
    }
}
