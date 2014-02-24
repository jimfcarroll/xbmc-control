#!/bin/sh

#!/bin/sh

IP_ADDR=`wget -q --output-document - http://jiminger.com/ip-arrowhead.txt | tail -1`

if [ "$IP_ADDR" = "" ]; then
    echo "Couldn't retrieve the current IP address for the AH home."
    exit 1
fi

MATCH=`echo "$IP_ADDR" | sed -e "s/[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}//1"`

if [ "$MATCH" != "" ]; then
    echo "The IP Address ($IP_ADDR) retrieved for the AH home doesn't appear to be a valid IP."
    exit 1
fi

#echo "Setting up port-forward to Pivos"
#ssh root@$IP_ADDR 'iptables -t nat -I PREROUTING -p tcp -d $(nvram get wan_ipaddr) --dport 441 -j DNAT --to 172.16.2.12:23; iptables -I FORWARD -p tcp -d 172.16.2.12 --dport 23 -j ACCEPT; sleep 1'
#
#ssh -t root@$IP_ADDR -p 441 'busybox umount /mnt/media'
#ssh -t root@$IP_ADDR -p 441 'busybox mkdir -p /mnt/media'
#ssh -t root@$IP_ADDR -p 441 'busybox mount -o unc=\\\\172.16.4.10\\Public,username=guest,password=guest -t cifs //172.16.4.10/Public /mnt/media'
#
#echo "closing up connection to Pivos ...."
#ssh root@$IP_ADDR 'iptables -t nat -D PREROUTING -p tcp -d $(nvram get wan_ipaddr) --dport 441 -j DNAT --to 172.16.2.12:23; iptables -D FORWARD -p tcp -d 172.16.2.12 --dport 23 -j ACCEPT; sleep 1'

# Set up port-forwarding on port 440 so that we can ssh into Media to issue a curl to Pivos
echo "Setting up port-forward"
ssh root@$IP_ADDR 'iptables -t nat -I PREROUTING -p tcp -d $(nvram get wan_ipaddr) --dport 440 -j DNAT --to 172.16.2.12:22; iptables -I FORWARD -p tcp -d 172.16.2.12 --dport 22 -j ACCEPT; sleep 1'

# ssh into Media to issue a curl to Pivos.
ssh -t root@$IP_ADDR -p 440 "curl -v -H \"Accept: application/json\" -H \"Content-type: application/json\" -d '{\"id\":1,\"jsonrpc\":\"2.0\",\"method\":\"VideoLibrary.Export\", \"params\": { \"options\": { \"path\" : \"/mnt/sdcard/exports\" } } }' http://pivos:8080/jsonrpc"

# Disable the port-forward
echo "closing up...."
ssh root@$IP_ADDR 'iptables -t nat -D PREROUTING -p tcp -d $(nvram get wan_ipaddr) --dport 440 -j DNAT --to 172.16.2.12:22; iptables -D FORWARD -p tcp -d 172.16.2.12 --dport 22 -j ACCEPT; sleep 1'
