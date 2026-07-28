package com.tutor.tutormanagementsystem.repository;

import com.tutor.tutormanagementsystem.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
}
