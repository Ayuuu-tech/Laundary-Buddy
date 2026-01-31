package com.laundrybuddy.db;

import androidx.room.TypeConverter;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.laundrybuddy.models.Order;

import java.lang.reflect.Type;
import java.util.Collections;
import java.util.List;

public class Converters {
    @TypeConverter
    public static List<Order.OrderItem> fromString(String value) {
        if (value == null) {
            return Collections.emptyList();
        }
        Type listType = new TypeToken<List<Order.OrderItem>>() {
        }.getType();
        return new Gson().fromJson(value, listType);
    }

    @TypeConverter
    public static String fromList(List<Order.OrderItem> list) {
        Gson gson = new Gson();
        return gson.toJson(list);
    }
}
