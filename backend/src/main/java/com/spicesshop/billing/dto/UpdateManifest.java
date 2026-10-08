package com.spicesshop.billing.dto;

public class UpdateManifest {
    private String version;
    private String jarUrl;

    public String getVersion() {
        return this.version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public String getJarUrl() {
        return this.jarUrl;
    }

    public void setJarUrl(String jarUrl) {
        this.jarUrl = jarUrl;
    }
}
