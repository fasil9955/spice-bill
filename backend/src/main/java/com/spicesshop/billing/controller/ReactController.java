package com.spicesshop.billing.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ReactController {

    @GetMapping({"/", "/{path:[^\\.]*}", "/{path:^(?!api|uploads).*$}/**"})
    public String forward() {
        return "forward:/index.html";
    }
}
