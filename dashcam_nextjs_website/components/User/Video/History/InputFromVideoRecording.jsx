import React, { useState } from "react";
import { Select, DatePicker, Button, Space, List, Tag, Spin } from "antd";
import { SearchOutlined, PlayCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Option } = Select;

const InputFormVideoRecording = ({ 
  devices = [], 
  loading = false, 
  onSearch, 
  videoList = [], 
  onPlay,
  isSearching = false
}) => {
  const [deviceId, setDeviceId] = useState(null);
  const [date, setDate] = useState(dayjs());

  const handleSearchClick = () => {
    if (onSearch && deviceId && date) {
      onSearch(deviceId, date);
    }
  };

  const handleReset = () => {
    setDeviceId(null);
    setDate(dayjs());
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
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
            onClick={handleSearchClick}
            disabled={!deviceId || isSearching}
            loading={isSearching}
          >
            Search
          </Button>

          <Button type="link" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </Space>

      {/* Video List */}
      <div className="mt-6 flex-1 overflow-y-auto">
        {isSearching ? (
          <div className="flex justify-center py-8">
            <Spin tip="Loading videos..." />
          </div>
        ) : (
          <List
            header={<div className="font-semibold text-gray-700">Available Videos ({videoList.length})</div>}
            bordered
            dataSource={videoList}
            renderItem={(item) => (
              <List.Item 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => onPlay && onPlay(item)}
              >
                <div className="flex flex-col w-full">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-gray-800">
                      {dayjs(item.videoDate || item.recorded).format('HH:mm:ss')}
                    </span>
                    <Tag color={item.channel === 0 ? "blue" : "green"}>
                      {item.cameraType || (item.channel === 0 ? "Front" : "Rear")}
                    </Tag>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{item.filename}</span>
                    <PlayCircleOutlined className="text-lg text-blue-500" />
                  </div>
                </div>
              </List.Item>
            )}
            locale={{ emptyText: 'No videos found' }}
          />
        )}
      </div>
    </div>
  );
};

export default InputFormVideoRecording;
