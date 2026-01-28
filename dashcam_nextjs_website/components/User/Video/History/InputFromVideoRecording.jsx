import React, { useState } from "react";
import { Select, DatePicker, Button, Space } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Option } = Select;

const InputFormVideoRecording = ({ devices = [], loading = false }) => {
  const [deviceId, setDeviceId] = useState(null);
  const [date, setDate] = useState(dayjs());

  const handleSearch = () => {
    console.log("Search clicked");
    console.log("Device ID:", deviceId);
    console.log("Date:", date?.format("YYYY-MM-DD"));
    // TODO: Implement actual search functionality
  };

  const handleReset = () => {
    setDeviceId(null);
    setDate(dayjs());
  };

  return (
    <div style={{ width: "100%" }}>
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        {/* Device Dropdown */}
        <Select
          placeholder={loading ? "Loading devices..." : "Select Device"}
          value={deviceId}
          onChange={setDeviceId}
          style={{ width: "100%" }}
          loading={loading}
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
        >
          {devices.map((device) => {
            const deviceName = device.deviceName || device.deviceModel || `Device-${device.imei?.slice(-4)}`;
            const label = `${deviceName} [${device.imei}]`;
            return (
              <Option key={device.id} value={device.imei} label={label}>
                {label}
              </Option>
            );
          })}
        </Select>

        {/* Date Picker */}
        <DatePicker
          value={date}
          onChange={setDate}
          format="YYYY-MM-DD"
          style={{ width: "100%" }}
        />

        {/* Search + Reset */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            style={{ flex: 1 }}
            onClick={handleSearch}
            disabled={!deviceId}
          >
            Search
          </Button>

          <Button type="link" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </Space>
    </div>
  );
};

export default InputFormVideoRecording;
