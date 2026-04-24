import React, { useState } from 'react';
import { Popover, Button, Switch, Divider, Space, Select, Tag } from 'antd';
import { SlidersOutlined, AppstoreOutlined, MenuOutlined } from '@ant-design/icons';

const DisplaySettings = () => {
  const [open, setOpen] = useState(false);

  // Đây chính là nội dung của cái khung nổi lên
  const popoverContent = (
    <div style={{ width: '300px' }}>
      {/* Phần 1: Chọn Layout (Cards / Rows) */}
      <div className="flex gap-2 mb-4">
        <Button className="flex-1 h-12" icon={<AppstoreOutlined />}>Cards</Button>
        <Button className="flex-1 h-12" icon={<MenuOutlined />} type="text">Rows</Button>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* Phần 2: Ordering */}
      <div className="flex justify-between items-center mb-4">
        <span>Ordering</span>
        <Select defaultValue="date" style={{ width: 140 }}>
          <Select.Option value="date">Date created</Select.Option>
          <Select.Option value="name">Name</Select.Option>
        </Select>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* Phần 3: Switch */}
      <div className="flex justify-between items-center mb-4">
        <span>Show archived links</span>
        <Switch />
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* Phần 4: Properties Tags */}
      <div>
        <div style={{ fontSize: '12px', color: 'gray', marginBottom: '8px' }}>DISPLAY PROPERTIES</div>
        <Space size={[8, 8]} wrap>
          <Tag>Short link</Tag>
          <Tag>Destination URL</Tag>
          <Tag>Title</Tag>
          <Tag>Description</Tag>
          <Tag>Created Date</Tag>
        </Space>
      </div>
    </div>
  );

  return (
    <Popover
      content={popoverContent}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft" // Canh khung nổi xuất hiện ở góc dưới bên trái nút
    >
      <Button icon={<SlidersOutlined />}>Display</Button>
    </Popover>
  );
};

export default DisplaySettings;