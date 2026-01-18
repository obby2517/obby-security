
import { Visitor } from "../types";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyh7-dtnRuRINYqG3_ArBmTs3xhdJ2NggqSNBqpDwu0Ztg7cfsDa58m989lRCkj2Tt_yA/exec";

async function apiRequest(method: 'GET' | 'POST', payload?: any) {
  let url = SCRIPT_URL;
  
  const options: RequestInit = {
    method: method,
    redirect: 'follow',
    mode: 'cors',
  };

  if (method === 'GET' && payload) {
    const params = new URLSearchParams(payload).toString();
    url += (url.includes('?') ? '&' : '?') + params;
  } else if (method === 'POST') {
    options.body = JSON.stringify(payload);
  }

  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const text = await response.text();
    
    if (!text || text.trim().startsWith('<!DOCTYPE html>')) {
      return { status: 'error', message: 'Server Configuration Required' };
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      // Return safe object if parsing fails (likely plain text error from GAS)
      console.warn("Raw Server Response:", text);
      return { status: 'error', message: 'Failed to parse server data' };
    }

    return json;
  } catch (error: any) {
    console.error(`API Call Failed: ${method}`, error.message);
    throw error;
  }
}

export async function fetchHouses(): Promise<string[]> {
  try {
    const result = await apiRequest('GET', { action: 'readHouses' });
    if (result && result.status === 'success' && Array.isArray(result.data)) {
      return result.data;
    }
    return [];
  } catch (error) {
    return [];
  }
}

export async function fetchVisitors(): Promise<Visitor[]> {
  try {
    const result = await apiRequest('GET', { action: 'read' });
    if (result && result.status === 'success' && Array.isArray(result.data)) {
      return result.data.map((v: any) => ({
        ...v,
        id: String(v.id || ""),
        checkInTime: v.checkInTime ? new Date(v.checkInTime) : new Date(),
        checkOutTime: v.checkOutTime ? new Date(v.checkOutTime) : undefined,
        status: v.status || (v.checkOutTime ? 'OUT' : 'IN')
      }));
    }
    return [];
  } catch (error) {
    return [];
  }
}

export async function createVisitor(visitor: Partial<Visitor>): Promise<Visitor | null> {
  try {
    const result = await apiRequest('POST', {
      action: 'create',
      data: {
        ...visitor,
        checkInTime: new Date().toISOString()
      }
    });

    if (result && result.status === 'success') {
      const v = result.data;
      return {
        ...v,
        id: String(v.id),
        checkInTime: new Date(v.checkInTime)
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

export async function updateVisitor(visitor: Visitor): Promise<boolean> {
  if (!visitor.id) return false;
  try {
    const safeCheckIn = visitor.checkInTime instanceof Date ? visitor.checkInTime : new Date(visitor.checkInTime);
    const result = await apiRequest('POST', {
      action: 'update',
      data: {
        ...visitor,
        id: String(visitor.id),
        checkInTime: safeCheckIn.toISOString(),
        checkOutTime: visitor.checkOutTime ? new Date(visitor.checkOutTime).toISOString() : undefined
      }
    });
    return !!(result && result.status === 'success');
  } catch (error) {
    return false;
  }
}

export async function checkOutVisitor(id: string): Promise<Visitor | null> {
  if (!id) return null;
  try {
    const result = await apiRequest('POST', {
      action: 'checkout',
      id: String(id),
      checkOutTime: new Date().toISOString()
    });

    if (result && result.status === 'success' && result.data) {
      const v = result.data;
      return {
        ...v,
        id: String(v.id),
        checkInTime: new Date(v.checkInTime),
        checkOutTime: new Date(v.checkOutTime)
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}
