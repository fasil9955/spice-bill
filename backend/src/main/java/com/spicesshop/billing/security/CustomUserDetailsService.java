package com.spicesshop.billing.security;

import com.spicesshop.billing.model.User;
import com.spicesshop.billing.repository.UserRepository;
import java.util.Collections;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // In this system, 'username' is the company name for Admin or a combined unique key.
        // Simplified lookup for recovery:
        User user = this.userRepository.findByCompanyNameAndRole(username, User.Role.ADMIN)
            .orElseGet(() -> this.userRepository.findByCompanyNameAndRole(username, User.Role.CASHIER)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username)));

        return new org.springframework.security.core.userdetails.User(
            user.getCompanyName(),
            user.getPassword(),
            Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }
}
